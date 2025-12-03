const mysql = require('mysql2');

const db = mysql.createPool({
  host: '127.0.0.1',
  user: 'sauer',
  password: 'Heslo',
  database: 'projekt_sauer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});



module.exports = db;
