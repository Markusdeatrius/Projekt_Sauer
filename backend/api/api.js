const express = require('express');
const db = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();
const authenticateToken = require('../middleware/auth');

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
      (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ error: 'Uživatel s tímto uživatelským jménem již existuje' });
          return res.status(500).json({ error: err.message });
        }

        db.query('SELECT uuid FROM users WHERE username = ?', [username], (err2, rows) => {
          if (err2) return res.status(500).json({ error: err2.message });
          return res.status(201).json({ uuid: rows[0].uuid, username });
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Hashing failed', details: err.message });
  }
});

// ---- Přihlášení uživatele + JWT ----
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

      if (!match) return res.status(401).json({ success: false, message: 'Neplatné heslo' });

      // --- JWT generování ---
      const token = jwt.sign(
        { userId: user.uuid, username: user.username },
        process.env.JWT_SECRET_KEY || 'replace_me',
        { expiresIn: '1d' }
      );

      res.json({ success: true, token, uuid: user.uuid, username: user.username });
    }
  );
});

// ---- Kontrola tokenu ----
router.get('/check-auth', authenticateToken, (req, res) => {
  res.json({ loggedIn: true, user: req.user });
});

// ---- GET product podle barcode ----
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

// ---- POST products (přidání produktu) ----
router.post('/products', authenticateToken, (req, res) => {
  const { barcode, productName } = req.body;
  const user = req.user; // JWT payload

  if (!barcode || !productName) return res.status(400).json({ error: 'Chybí barcode nebo název' });

  db.query('SELECT uuid FROM products WHERE barcode = ?', [barcode], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length > 0) {
      const existingUuid = results[0].uuid;

      db.query('UPDATE warehouse SET product_in = product_in + 1 WHERE product_uuid = ?', [existingUuid], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

        db.query(
          'INSERT INTO stocking (user_uuid, product_uuid, quantity) VALUES (?, ?, 1)',
          [user.userId, existingUuid, 1]
        );

        return res.json({ created: false, message: 'Produkt aktualizován + stocking zapsán' });
      });
    } else {
      db.query('INSERT INTO products (barcode, productName) VALUES (?, ?)', [barcode, productName], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

        db.query('SELECT uuid FROM products WHERE barcode = ?', [barcode], (err3, rows) => {
          if (err3) return res.status(500).json({ error: err3.message });
          const newUuid = rows[0].uuid;

          db.query('INSERT INTO warehouse (product_uuid, product_in) VALUES (?, 1)', [newUuid], (err4) => {
            if (err4) return res.status(500).json({ error: err4.message });

            db.query(
              'INSERT INTO stocking (user_uuid, product_uuid, quantity) VALUES (?, ?, 1)',
              [user.userId, newUuid, 1]
            );

            res.status(201).json({ created: true, message: 'Produkt přidán + stocking zapsán' });
          });
        });
      });
    }
  });
});

// ---- GET warehouse ----
router.get('/warehouse', (req, res) => {
  db.query(
    `SELECT w.product_in, p.productName, p.barcode
     FROM warehouse w
     JOIN products p ON w.product_uuid = p.uuid`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// ---- OUT / dávkový výdej ----
router.post('/out/issue', authenticateToken, (req, res) => {
  const { items } = req.body;
  const user = req.user;

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Neplatný payload: očekáváme pole items' });

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: err.message });
    let idx = 0;

    const rollback = (status, body) => db.rollback(() => res.status(status).json(body));

    const processNext = () => {
      if (idx >= items.length) {
        return db.commit(err => {
          if (err) return rollback(500, { error: err.message });
          return res.json({ success: true, processed: items.length });
        });
      }

      const { barcode, quantity } = items[idx];
      const qty = parseInt(quantity, 10) || 1;

      db.query('SELECT uuid FROM products WHERE barcode = ?', [barcode], (err1, prodRows) => {
        if (err1) return rollback(500, { error: err1.message });
        if (!prodRows || prodRows.length === 0)
          return rollback(404, { error: `Produkt ${barcode} nenalezen` });

        const productUuid = prodRows[0].uuid;

        db.query('SELECT product_in FROM warehouse WHERE product_uuid = ?', [productUuid], (err2, whRows) => {
          if (err2) return rollback(500, { error: err2.message });

          const currentIn = whRows?.[0]?.product_in ?? 0;
          if (currentIn < qty)
            return rollback(409, { error: `Nedostatek zásob ${barcode}: dostupné ${currentIn}, požadováno ${qty}` });

          db.query('UPDATE warehouse SET product_in = product_in - ? WHERE product_uuid = ?', [qty, productUuid], (err3) => {
            if (err3) return rollback(500, { error: err3.message });

            db.query(
              'INSERT INTO picking (user_uuid, product_uuid, quantity) VALUES (?, ?, ?)',
              [user.userId, productUuid, qty]
            );

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
