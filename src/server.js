const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { SITE_DIR, SITE_URL } = require('./updater');

let server = null;

function fetchAndCache(urlPath, targetFile) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${SITE_URL}${urlPath}`;
    https.get(fullUrl, { headers: { 'User-Agent': 'BrickCode-App/1.0' }, timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Status ${res.statusCode}`));
        return;
      }
      const dir = path.dirname(targetFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const stream = fs.createWriteStream(targetFile);
      res.pipe(stream);
      stream.on('finish', () => resolve(true));
      stream.on('error', reject);
    }).on('error', reject);
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const app = express();

    // 1. Serve static files from the local BrickCode site directory
    app.use(express.static(SITE_DIR, {
      extensions: ['html'],
      index: 'index.html'
    }));

    // 2. On-demand proxy & cache for any missing static resources
    app.use(async (req, res, next) => {
      // Ignore API or root routes
      if (req.method !== 'GET' || req.path === '/' || req.path === '/index.html') {
        return next();
      }

      const localPath = path.join(SITE_DIR, req.path);
      if (!fs.existsSync(localPath)) {
        try {
          await fetchAndCache(req.path, localPath);
          return res.sendFile(localPath);
        } catch {
          // If remote fetch fails (e.g. offline), proceed to fallback
        }
      }
      next();
    });

    // 3. Fallback to index.html for SPA routes
    app.get('*', (req, res) => {
      const indexPath = path.join(SITE_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send('BrickCode files are initializing...');
      }
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
