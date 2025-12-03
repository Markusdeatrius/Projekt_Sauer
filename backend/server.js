const express = require('express');
const cors = require('cors');
const path = require('path');
const seed = require('./database/seed');
const db = require('./database/db');
const session = require('express-session');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();

app.get("/test", (req, res) => {
    res.json({ ok: true });
});

app.use(cors({ origin: 'http://localhost:8081', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'Heslo',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 86400000 }
}));

(async () => {
    try {
        await seed();

        const apiRoutes = require('./api/api');
        app.use('/api', apiRoutes);

        const PORT = process.env.PORT;
        app.listen(PORT, () => {
            console.log(`Server běží na http://localhost:${PORT}`);
        });
    } catch (e) {
        console.error('Chyba při seedování:', e);
    }
})();
