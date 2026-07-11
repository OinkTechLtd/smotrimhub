require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const routes = {
  '/': 'index.html',
  '/faq': 'faq.html',
  '/docs': 'docs.html',
  '/privacy': 'privacy.html',
  '/terms': 'terms.html'
};

const server = http.createServer((req, res) => {
  const filePath = routes[req.url] || 'index.html';
  const fullPath = path.join(__dirname, 'templates', filePath);

  fs.readFile(fullPath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});