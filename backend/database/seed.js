const db = require('./db');
const fs = require('fs');
const path = require('path');

async function seed() {
    return new Promise((resolve, reject) => {
        const sql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

        db.query(sql, (err, results) => {
            if (err) return reject(err);
            console.log("seed je uspesny")
            resolve(results);
        });
    });
}

module.exports = seed;
