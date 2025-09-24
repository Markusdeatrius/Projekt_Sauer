const cors = require('cors');
const express = require('express');
const path = require('path');
const seed = require('./database/seed');
const db = require('./database/db');
const session = require('express-session');

const app = express();

app.use(cors({
  origin: 'http://localhost:8081',
  credentials: true
}));

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'Heslo',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// Výchozí stránka
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend/public/index.html'));
});

(async () => {
  try {
    await seed();

    // ✅ Endpoint pro získání uživatelů (MySQL verze)
    app.get('/api/users', (req, res) => {
      db.query(`SELECT * FROM users`, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
      });
    });

    // Připojení API rout
    const apiRoutes = require('./api/api');
    app.use('/api', apiRoutes);

    app.listen(port, () => {
      console.log(`Server běží na http://localhost:${port}`);
    });
  } catch (e) {
    console.error('Chyba při seedování:', e);
  }
})();
