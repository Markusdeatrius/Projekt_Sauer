const express = require('express');
const db = require('../database/db');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Registrace uživatele
router.post('/register', async (req, res) => {
  const { firstname, surname, username, password } = req.body; // tady má přijít "password"

  try {
    // 1. hash hesla
    const passhash = await bcrypt.hash(password, 10);

    // 2. ulož do DB
    db.query(
      'INSERT INTO users (firstname, surname, username, passhash) VALUES (?, ?, ?, ?)',
      [firstname, surname, username, passhash],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: result.insertId, username });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Hashing failed', details: err.message });
  }
});

// Přihlášení uživatele
router.post('/login', (req, res) => {
  const { username, password } = req.body; // frontend posílá čisté heslo

  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(401).json({ success: false, message: 'Uživatel nenalezen' });
      }

      const user = results[0];

      // Ověření hesla
      const match = await bcrypt.compare(password, user.passhash);

      if (match) {
        req.session.user = { id: user.id, username: user.username };
        res.json({ success: true, message: 'Přihlášení úspěšné' });
      } else {
        res.status(401).json({ success: false, message: 'Neplatné heslo' });
      }
    }
  );
});

// Kontrola přihlášení
router.get('/check-auth', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
