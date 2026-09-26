const express = require('express');
const path = require('path');
const { SITE_DIR } = require('./updater');

let server = null;

function startServer() {
  return new Promise((resolve, reject) => {
    const app = express();

    // Serve static files from the BrickCode site directory
    app.use(express.static(SITE_DIR, {
      extensions: ['html'],
      index: 'index.html'
    }));

    // Fallback to index.html for SPA routes
    app.get('*', (req, res) => {
      const indexPath = path.join(SITE_DIR, 'index.html');
      res.sendFile(indexPath);
    });

    // Listen on random available port
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log(`BrickCode server running on http://127.0.0.1:${port}`);
      resolve(port);
    });

    server.on('error', reject);
  });
}

function stopServer() {
  if (server) {
    server.close();
    server = null;
  }
}

module.exports = { startServer, stopServer };
