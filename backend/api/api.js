const express = require('express');
const db = require('../database/seeds/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const lowStockCache = new Map();

async function checkLowStock(productUuid, currentCount, safetyStock, productName) {
    if (currentCount > safetyStock) {
        lowStockCache.delete(productUuid);
        return;
    }
    if (lowStockCache.has(productUuid)) return;

    try {
        await sendLowStockEmail(productName, currentCount);
        lowStockCache.set(productUuid, true);
    } catch (err) {
        console.error('Chyba při odesílání e-mailu:', err);
    }
}


async function sendLowStockEmail(productName, count) {
    
    const mailerSend = new MailerSend({
        apiKey: process.env.MAILERSEND_API_KEY
    });

    const sentFrom = new Sender(process.env.MAILERSEND_FROM, "Sklad");

    const recipients = [
        new Recipient(process.env.NOTIFY_EMAIL, "Admin")
    ];

    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject(`Nízký stav produktu: ${productName}`)
        .setText(`Produkt ${productName} potřebuje doplnit, na skladě je ${count} kusů.`);

    await mailerSend.email.send(emailParams);
}

// --- Registrace ---
router.post('/register', async (req, res) => {
    try {
        const { firstname, surname, username, password } = req.body;
        if (!firstname || !surname || !username || !password)
            return res.status(400).json({ error: 'Chybí údaje' });

        const passhash = await bcrypt.hash(password, 10);

        await db.promise().query(
            'INSERT INTO users (firstname, surname, username, passhash) VALUES (?, ?, ?, ?)',
            [firstname, surname, username, passhash]
        );

        const [rows] = await db.promise().query(
            'SELECT uuid FROM users WHERE username = ?',
            [username]
        );

        return res.status(201).json({
            uuid: rows[0].uuid,
            username
        });

    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ error: 'Uživatel existuje' });

        return res.status(500).json({ error: err.message });
    }
});

// --- Login ---
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: 'Chybí údaje' });

        const [rows] = await db.promise().query(
            'SELECT uuid, username, passhash FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0)
            return res.status(401).json({ error: 'Uživatel nenalezen' });

        const user = rows[0];

        const match = await bcrypt.compare(password, user.passhash);
        if (!match)
            return res.status(401).json({ error: 'Neplatné heslo' });

        const token = jwt.sign(
            { userId: user.uuid, username: user.username },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1d' }
        );
        
        req.session.user = { uuid: user.uuid, username: user.username };
        return res.json({
            success: true,
            token,
            uuid: user.uuid,
            username: user.username
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// --- Kontrola tokenu ---
router.get('/check-auth', authenticateToken, (req, res) => {
    res.json({ loggedIn: true, user: req.user });
});

// ---- GET product podle barcode ----
router.get('/products/:barcode', (req, res) => {
    const { barcode } = req.params;
    db.query(
        `SELECT p.uuid, p.barcode, p.productName, IFNULL(w.product_in,0) AS productIn, IFNULL(w.safety_stock,0) AS safetyStock
         FROM products p
         LEFT JOIN warehouse w ON w.product_uuid = p.uuid
         WHERE p.barcode = ?`,
        [barcode],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.json({ exists: false, barcode });
            const row = results[0];
            res.json({
                exists: true,
                uuid: row.uuid,
                barcode: row.barcode,
                productName: row.productName,
                productIn: row.productIn,
                safetyStock: row.safetyStock
            });
        }
    );
});

// ---- POST products (přidání produktu) ----
// ---- POST products (přidání produktu) ----
router.post('/products', authenticateToken, (req, res) => {
    const { barcode, productName, safety_stock } = req.body;
    const user = req.user;

    const safetyStock = Number(safety_stock) || 0;
    const safetyIsNumber = Number.isInteger(safetyStock);

    if (!barcode || !productName)
        return res.status(400).json({ error: 'Chybí barcode nebo název' });

    db.query('SELECT uuid FROM products WHERE barcode = ?', [barcode], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        // ----- EXISTUJÍCÍ PRODUKT -----
        if (results.length > 0) {
            const existingUuid = results[0].uuid;

            const query = safetyIsNumber
                ? 'UPDATE warehouse SET product_in = product_in + 1, safety_stock = ? WHERE product_uuid = ?'
                : 'UPDATE warehouse SET product_in = product_in + 1 WHERE product_uuid = ?';

            const params = safetyIsNumber
                ? [safetyStock, existingUuid]
                : [existingUuid];

            db.query(query, params, (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });

                db.query(
                    'INSERT INTO stocking (user_uuid, product_uuid, quantity) VALUES (?, ?, 1)',
                    [user.userId, existingUuid, 1]
                );

                db.query(
                    'SELECT product_in, safety_stock FROM warehouse WHERE product_uuid = ?',
                    [existingUuid],
                    (err3, whRows) => {
                        if (!err3 && whRows.length > 0) {
                            checkLowStock(
                                existingUuid,
                                whRows[0].product_in,
                                whRows[0].safety_stock,
                                productName
                            );
                        }
                    }
                );

                return res.json({ created: false, message: 'Produkt aktualizován + stocking zapsán' });
            });

            return;
        }

        // ----- NOVÝ PRODUKT -----
        const safeSafety = safetyIsNumber ? safetyStock : 0;

        db.query(
            'INSERT INTO products (barcode, productName) VALUES (?, ?)',
            [barcode, productName],
            (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });

                db.query(
                    'SELECT uuid FROM products WHERE barcode = ?',
                    [barcode],
                    (err3, rows) => {
                        if (err3) return res.status(500).json({ error: err3.message });
                        const newUuid = rows[0].uuid;

                        db.query(
                            'INSERT INTO warehouse (product_uuid, product_in, safety_stock) VALUES (?, 1, ?)',
                            [newUuid, safeSafety],
                            (err4) => {
                                if (err4) return res.status(500).json({ error: err4.message });

                                db.query(
                                    'INSERT INTO stocking (user_uuid, product_uuid, quantity) VALUES (?, ?, 1)',
                                    [user.userId, newUuid, 1]
                                );

                                checkLowStock(newUuid, 1, safeSafety, productName);

                                res.status(201).json({
                                    created: true,
                                    message: 'Produkt přidán + stocking zapsán'
                                });
                            }
                        );
                    }
                );
            }
        );
    });
});


// ---- GET warehouse ----
router.get('/warehouse', (req, res) => {
    db.query(
        `SELECT w.product_in, w.safety_stock, p.productName, p.barcode
         FROM warehouse w
         JOIN products p ON w.product_uuid = p.uuid`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// ---- OUT / dávkový výdej ----
router.post('/out/issue', authenticateToken, async (req, res) => {
    const { items } = req.body;
    const user = req.user;

    if (!Array.isArray(items) || items.length === 0)
        return res.status(400).json({ error: 'Neplatný payload: očekáváme pole items' });

    const conn = await db.promise().getConnection();
    try {
        await conn.beginTransaction();

        for (const { barcode, quantity } of items) {
            const qty = parseInt(quantity, 10) || 1;

            const [prodRows] = await conn.query('SELECT uuid FROM products WHERE barcode = ?', [barcode]);
            if (prodRows.length === 0) throw { status: 404, message: `Produkt ${barcode} nenalezen` };
            const productUuid = prodRows[0].uuid;

            const [whRows] = await conn.query('SELECT product_in, safety_stock FROM warehouse WHERE product_uuid = ?', [productUuid]);
            const currentIn = whRows?.[0]?.product_in ?? 0;
            const safetyStock = whRows?.[0]?.safety_stock ?? 0;

            if (currentIn < qty) throw { status: 409, message: `Nedostatek zásob ${barcode}: dostupné ${currentIn}, požadováno ${qty}` };

            const updatedCount = currentIn - qty;

            await conn.query('UPDATE warehouse SET product_in = ? WHERE product_uuid = ?', [updatedCount, productUuid]);
            await conn.query('INSERT INTO picking (user_uuid, product_uuid, quantity) VALUES (?, ?, ?)', [user.userId, productUuid, qty]);

        const [prodNameRows] = await conn.query('SELECT productName FROM products WHERE uuid = ?', [productUuid]);
        const productName = prodNameRows[0]?.productName || barcode;
        checkLowStock(productUuid, updatedCount, safetyStock, productName);
        }

        await conn.commit();
        res.json({ success: true, processed: items.length });
    } catch (err) {
        await conn.rollback();
        res.status(err.status || 500).json({ error: err.message || err });
    } finally {
        conn.release();
    }
});

// ---- POST /products/bulk ----
router.post('/products/bulk', authenticateToken, async (req, res) => {
    const { items } = req.body;
    const user = req.user;

    if (!Array.isArray(items) || items.length === 0)
        return res.status(400).json({ error: 'Neplatný payload: očekáváme pole items' });

    const conn = await db.promise().getConnection();
    try {
        await conn.beginTransaction();

        for (const { barcode, quantity, safety_stock } of items) {
            const qty = parseInt(quantity, 10) || 1;
            const safeStock = parseInt(safety_stock, 10) || 0;

            const [prodRows] = await conn.query('SELECT uuid FROM products WHERE barcode = ?', [barcode]);
            if (prodRows.length === 0) throw { status: 404, message: `Produkt ${barcode} nenalezen` };
            const productUuid = prodRows[0].uuid;

            const [whRows] = await conn.query('SELECT product_in, safety_stock FROM warehouse WHERE product_uuid = ?', [productUuid]);
            if (whRows.length === 0) throw { status: 404, message: `Produkt ${barcode} nemá sklad` };
            const currentIn = whRows[0].product_in;

            await conn.query('UPDATE warehouse SET product_in = product_in + ?, safety_stock = ? WHERE product_uuid = ?', [qty, safeStock, productUuid]);
            await conn.query('INSERT INTO stocking (user_uuid, product_uuid, quantity) VALUES (?, ?, ?)', [user.userId, productUuid, qty]);
        }

        await conn.commit();
        res.json({ success: true, processed: items.length });
    } catch (err) {
        await conn.rollback();
        res.status(err.status || 500).json({ error: err.message || err });
    } finally {
        conn.release();
    }
});

module.exports = router;
