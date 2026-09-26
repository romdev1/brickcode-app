const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { app } = require('electron');

const SITE_URL = 'https://beta.brickcode.org';
const GITHUB_COMMITS_API = 'https://api.github.com/repos/pxt-ev3-community/pxt-ev3/commits/master';
const userDataPath = (app && typeof app.getPath === 'function')
  ? app.getPath('userData')
  : path.join(process.env.APPDATA || process.env.USERPROFILE || '.', 'brickcode-offline');
const DATA_DIR = path.join(userDataPath, 'brickcode-data');
const SITE_DIR = path.join(DATA_DIR, 'site');
const VERSION_FILE = path.join(DATA_DIR, 'version.json');
const BUNDLED_ZIP = path.join(__dirname, '..', 'assets', 'bundled-site.zip');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SITE_DIR)) fs.mkdirSync(SITE_DIR, { recursive: true });
}

function isFirstRun() {
  ensureDirs();
  const indexHtml = path.join(SITE_DIR, 'index.html');
  return !fs.existsSync(indexHtml);
}

function getLocalVersion() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      const data = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
      return data.version || data.commit || 'локальная';
    }
  } catch {}
  return '1.0.0';
}

function saveLocalVersion(info) {
  ensureDirs();
  fs.writeFileSync(VERSION_FILE, JSON.stringify({
    ...info,
    updatedAt: new Date().toISOString()
  }, null, 2));
}

function installBundledSite(onProgress) {
  return new Promise((resolve, reject) => {
    ensureDirs();
    if (!fs.existsSync(BUNDLED_ZIP)) {
      // If bundled zip doesn't exist, we'll download directly
      resolve(false);
      return;
    }

    try {
      const zip = new AdmZip(BUNDLED_ZIP);
      const entries = zip.getEntries();
      const total = entries.length;

      entries.forEach((entry, index) => {
        const fullPath = path.join(SITE_DIR, entry.entryName);
        if (entry.isDirectory) {
          if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
        } else {
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(fullPath, entry.getData());
        }
        if (onProgress && index % 50 === 0) {
          onProgress(Math.round((index / total) * 100));
        }
      });

      saveLocalVersion({
        version: 'v1.5.9 (базовая)',
        source: 'bundled'
      });

      if (onProgress) onProgress(100);
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
}

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'BrickCode-Offline/1.0',
        ...(options.headers || {})
      },
      timeout: 10000
    };

    const req = https.request(reqOptions, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        httpsRequest(redirectUrl, options).then(resolve).catch(reject);
        return;
      }

      if (options.method === 'HEAD') {
        resolve({ statusCode: res.statusCode, headers: res.headers });
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks)
      }));
      res.on('error', reject);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
    req.on('error', reject);
    req.end();
  });
}

async function checkForUpdates() {
  let localData = {};
  try {
    if (fs.existsSync(VERSION_FILE)) {
      localData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    }
  } catch {}

  // 1. Check site headers (ETag / Last-Modified from brickcode.org)
  const headRes = await httpsRequest(`${SITE_URL}/index.html`, { method: 'HEAD' });
  const remoteEtag = headRes.headers.etag || '';
  const remoteLastModified = headRes.headers['last-modified'] || '';

  // 2. Check latest commit from GitHub master
  let commitInfo = null;
  try {
    const commitRes = await httpsRequest(GITHUB_COMMITS_API);
    if (commitRes.statusCode === 200) {
      const commitJson = JSON.parse(commitRes.body.toString());
      commitInfo = {
        sha: commitJson.sha,
        shortSha: commitJson.sha.slice(0, 7),
        date: commitJson.commit.author.date
      };
    }
  } catch (e) {
    // If GitHub API rate limits or fails, fallback to ETag comparison
  }

  const remoteVersion = commitInfo
    ? `${commitInfo.shortSha} (${commitInfo.date.slice(0, 10)})`
    : (remoteLastModified || remoteEtag || 'новая версия');

  // Determine if update is available
  let hasUpdate = false;
  if (!localData.etag && !localData.commit) {
    hasUpdate = true;
  } else if (commitInfo && localData.commit && localData.commit !== commitInfo.sha) {
    hasUpdate = true;
  } else if (remoteEtag && localData.etag && localData.etag !== remoteEtag) {
    hasUpdate = true;
  } else if (remoteLastModified && localData.lastModified && localData.lastModified !== remoteLastModified) {
    hasUpdate = true;
  }

  return {
    hasUpdate,
    remoteVersion,
    remoteEtag,
    remoteLastModified,
    commit: commitInfo ? commitInfo.sha : null
  };
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    httpsRequest(url).then(res => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(destPath, res.body);
      resolve();
    }).catch(reject);
  });
}

async function downloadUpdate(onProgress) {
  ensureDirs();

  // 1. Fetch release.manifest
  const manifestRes = await httpsRequest(`${SITE_URL}/release.manifest`);
  const manifestText = manifestRes.statusCode === 200 ? manifestRes.body.toString() : '';

  // 2. Parse file paths from manifest
  const manifestFiles = manifestText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('/') && !l.includes(' ') && !l.startsWith('//'));

  // Core essential files that must always be updated
  const coreFiles = [
    '/index.html',
    '/targetconfig.json',
    '/target.js',
    '/sim.html',
    '/editor.js',
    '/fieldeditors.js',
    '/release.manifest'
  ];

  const allFiles = Array.from(new Set([...coreFiles, ...manifestFiles]));
  const total = allFiles.length;
  let completed = 0;

  // Concurrency pool of 5 simultaneous downloads
  const CONCURRENCY = 5;
  let index = 0;

  async function worker() {
    while (index < allFiles.length) {
      const file = allFiles[index++];
      const cleanPath = file.startsWith('/') ? file.slice(1) : file;
      const fileUrl = `${SITE_URL}/${cleanPath}`;
      const destPath = path.join(SITE_DIR, cleanPath);

      try {
        await downloadFile(fileUrl, destPath);
      } catch (err) {
        console.warn(`Failed to update ${file}:`, err.message);
      }

      completed++;
      if (onProgress) {
        onProgress(Math.round((completed / total) * 100));
      }
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  // Save updated version info
  try {
    const updateInfo = await checkForUpdates();
    saveLocalVersion({
      version: updateInfo.remoteVersion,
      commit: updateInfo.commit,
      etag: updateInfo.remoteEtag,
      lastModified: updateInfo.remoteLastModified,
      source: 'brickcode.org'
    });
  } catch {
    saveLocalVersion({
      version: 'обновлено с brickcode.org',
      source: 'brickcode.org'
    });
  }
}

module.exports = {
  checkForUpdates,
  downloadUpdate,
  getLocalVersion,
  isFirstRun,
  installBundledSite,
  SITE_DIR,
  SITE_URL
};
