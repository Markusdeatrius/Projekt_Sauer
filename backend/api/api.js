const express = require('express');
const db = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

// ---- JWT endpoints (nezmazáno, ale použito v routeru, app.listen má být v server.js) ----
router.post('/user/generateToken', (req, res) => {
  try {
    const jwtSecretKey = process.env.JWT_SECRET_KEY || 'replace_me';
    const data = {
      time: Date(),
      // tady normálně vložíš dynamicky userId a další údaje
      userId: 12,
    };
    const token = jwt.sign(data, jwtSecretKey);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user/validateToken', (req, res) => {
  try {
    const tokenHeaderKey = process.env.TOKEN_HEADER_KEY || 'authorization';
    const jwtSecretKey = process.env.JWT_SECRET_KEY || 'replace_me';

    const token = req.header(tokenHeaderKey);
    if (!token) return res.status(401).send('Token chybí');

    try {
      const verified = jwt.verify(token, jwtSecretKey);
      // vrátíme ověření (můžeš vrátit verified payload)
      return res.json({ valid: true, payload: verified });
    } catch (error) {
      return res.status(401).json({ valid: false, error: error.message });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ---- Registrace uživatele ----
router.post('/register', async (req, res) => {
  const { firstname, surname, username, password } = req.body;
  if (!firstname || !surname || !username || !password)
    return res.status(400).json({ error: 'Chybí údaje' });

  try {
    const passhash = await bcrypt.hash(password, 10);

    db.query(
      'INSERT INTO users (firstname, surname, username, passhash) VALUES (?, ?, ?, ?)',
      [firstname, surname, username, passhash],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        db.query(
          'SELECT uuid FROM users WHERE id = ?',
          [result.insertId],
          (err2, rows) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.status(201).json({ uuid: rows[0].uuid, username });
          }
        );
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Hashing failed', details: err.message });
  }
});

// ---- Přihlášení uživatele ----
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Chybí údaje' });

  db.query(
    'SELECT uuid, username, passhash FROM users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(401).json({ success: false, message: 'Uživatel nenalezen' });

      const user = results[0];
      const match = await bcrypt.compare(password, user.passhash);

      if (match) {
        req.session.user = { uuid: user.uuid, username: user.username };
        res.json({ success: true, uuid: user.uuid, username: user.username });
      } else {
        res.status(401).json({ success: false, message: 'Neplatné heslo' });
      }
    }
  );
});

// ---- Kontrola přihlášení ----
router.get('/check-auth', (req, res) => {
  if (req.session && req.session.user) res.json({ loggedIn: true, user: req.session.user });
  else res.json({ loggedIn: false });
});

// ---- PRODUCTS: GET by barcode (scan only, neukládá nic) ----
router.get('/products/:barcode', (req, res) => {
  const { barcode } = req.params;

  db.query(
    'SELECT uuid, barcode, productName FROM products WHERE barcode = ?',
    [barcode],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        // product nenalezen → frontend ví, že je nový
        return res.json({ exists: false, barcode });
      }

      const row = results[0];
      return res.json({
        exists: true,
        uuid: row.uuid,
        barcode: row.barcode,
        productName: row.productName
      });
    }
  );
});

// ---- PRODUCTS: POST create product + update warehouse ----
// ---- PRODUCTS: POST + update warehouse ----
router.post('/products', (req, res) => {
  const { barcode, productName } = req.body;
  if (!barcode || !productName) return res.status(400).json({ error: 'Chybí barcode nebo název' });

  db.query('SELECT uuid FROM products WHERE barcode = ?', [barcode], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length > 0) {
      const existingUuid = results[0].uuid;

      db.query('SELECT product_in FROM warehouse WHERE product_uuid = ?', [existingUuid], (err2, whResults) => {
        if (err2) return res.status(500).json({ error: err2.message });

        if (whResults.length > 0) {
          db.query('UPDATE warehouse SET product_in = product_in + 1 WHERE product_uuid = ?', [existingUuid], (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });
            return res.json({ created: false, warehouse_count: whResults[0].product_in + 1 });
          });
        } else {
          db.query('INSERT INTO warehouse (product_uuid, product_in) VALUES (?, 1)', [existingUuid], (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });
            return res.json({ created: false, warehouse_count: 1 });
          });
        }
      });
    } else {
      db.query('INSERT INTO products (barcode, productName) VALUES (?, ?)', [barcode, productName], (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });
        const newId = result.insertId;

        db.query('INSERT INTO warehouse (product_uuid, product_in) VALUES ((SELECT uuid FROM products WHERE id = ?), 1)', [newId], (err3) => {
          if (err3) return res.status(500).json({ error: err3.message });
          db.query('SELECT uuid, barcode, productName FROM products WHERE id = ?', [newId], (err4, rows) => {
            if (err4) return res.status(500).json({ error: err4.message });
            return res.status(201).json({ created: true, product: rows[0], warehouse_count: 1 });
          });
        });
      });
    }
  });
});

// ---- GET warehouse (pro front) ----
router.get('/warehouse', (req, res) => {
  db.query(`SELECT w.product_in, p.productName, p.barcode 
            FROM warehouse w 
            JOIN products p ON w.product_uuid = p.uuid`, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});



// ---- OUT: issue multiple items (dávkový výdej) ----
// dávkový výdej
// endpoint: získání produktu podle barcode
router.get('/products/:barcode', (req, res) => {
    const { barcode } = req.params;
    db.query(
        `SELECT p.uuid, p.barcode, p.productName, IFNULL(w.product_in,0) AS productIn 
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
                productIn: row.productIn
            });
        }
    );
});

// dávkový výdej (POST /out/issue)
router.post('/out/issue', (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Neplatný payload: očekáváme pole items' });
    }

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: err.message });
        let idx = 0;

        const rollback = (status, body) => db.rollback(() => res.status(status).json(body));

        const processNext = () => {
            if (idx >= items.length) return db.commit(err => {
                if (err) return rollback(500, { error: err.message });
                return res.json({ success: true, processed: items.length });
            });

            const { barcode, quantity } = items[idx];
            const qty = parseInt(quantity, 10) || 1;

            db.query('SELECT uuid FROM products WHERE barcode = ?', [barcode], (err1, prodRows) => {
                if (err1) return rollback(500, { error: err1.message });
                if (!prodRows || prodRows.length === 0) return rollback(404, { error: `Produkt ${barcode} nenalezen` });

                const productUuid = prodRows[0].uuid;
                db.query('SELECT product_in FROM warehouse WHERE product_uuid = ?', [productUuid], (err2, whRows) => {
                    if (err2) return rollback(500, { error: err2.message });

                    const currentIn = (whRows && whRows[0]) ? whRows[0].product_in : 0;
                    if (currentIn < qty) return rollback(409, { error: `Nedostatek zásob ${barcode}: dostupné ${currentIn}, požadováno ${qty}` });

                    db.query('UPDATE warehouse SET product_in = product_in - ? WHERE product_uuid = ?', [qty, productUuid], (err3) => {
                        if (err3) return rollback(500, { error: err3.message });
                        idx++;
                        processNext();
                    });
                });
            });
        };

        processNext();
    });
});






module.exports = router;
