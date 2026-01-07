const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const checkLoginRouter = require('./api/check-login');
const logoutRouter = require('./api/logout');

// Načtení API rout
const apiRoutes = require('./api/api'); 

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();

app.use(cors({ origin: 'http://localhost:8081', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'Heslo', // Ideálně použij ENV
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 86400000 }
}));

app.get("/test", (req, res) => {
    res.json({ ok: true });
});

app.use('/api/check-login', checkLoginRouter);
app.use('/api/logout', logoutRouter);
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;

// Start serveru bez čekání na DB operace
app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});