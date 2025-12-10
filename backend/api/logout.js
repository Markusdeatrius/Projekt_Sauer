const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Nelze odhlásit' });
        res.clearCookie('connect.sid'); 
        res.json({ success: true });
    });
});

module.exports = router;
