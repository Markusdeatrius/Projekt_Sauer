const express = require('express');
const path = require('path');

const app = express();
const port = 8081;

// Servíruj statické soubory z public, scripts a styles
app.use(express.static(path.join(__dirname, 'public')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// Výchozí stránka – root přesměrován na index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// 404 – pokud žádná jiná cesta nevyhovuje
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public/404error.html'));
});

app.listen(port, () => {
  console.log(`Frontend server běží na http://localhost:${port}`);
});
