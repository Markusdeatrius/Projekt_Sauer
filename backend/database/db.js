const mysql = require('mysql2');

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'sauer',
  password: 'Heslo',
  database: 'projekt_sauer'
});

db.connect((err) => {
  if (err) {
    console.error('Chyba při připojení k MySQL databázi:', err);
  } else {
    console.log('✅ Připojeno k MySQL databázi');
  }
});

module.exports = db;
