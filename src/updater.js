const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { app } = require('electron');

const GITHUB_API = 'https://api.github.com/repos/pxt-ev3-community/pxt-ev3/releases';
const DATA_DIR = path.join(app.getPath('userData'), 'brickcode-data');
const SITE_DIR = path.join(DATA_DIR, 'site');
const VERSION_FILE = path.join(DATA_DIR, 'version.json');
const DOWNLOAD_DIR = path.join(DATA_DIR, 'downloads');

function ensureDirs() {
  for (const dir of [DATA_DIR, SITE_DIR, DOWNLOAD_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function isFirstRun() {
  ensureDirs();
  return !fs.existsSync(VERSION_FILE) || !fs.existsSync(path.join(SITE_DIR, 'index.html'));
}

function getLocalVersion() {
  try {
    const data = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    return data.version || 'unknown';
  } catch {
    return 'none';
  }
}

function saveLocalVersion(version, tag) {
  fs.writeFileSync(VERSION_FILE, JSON.stringify({ version, tag, updatedAt: new Date().toISOString() }));
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'User-Agent': 'BrickCode-Offline/1.0' }
    };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGet(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function httpsDownload(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'User-Agent': 'BrickCode-Offline/1.0' }
    };

    function doRequest(reqUrl) {
      const proto = reqUrl.startsWith('https') ? https : http;
      proto.get(reqUrl, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const totalSize = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;
        const file = fs.createWriteStream(destPath);

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          file.write(chunk);
          if (totalSize > 0 && onProgress) {
            onProgress(Math.round((downloaded / totalSize) * 100));
          }
        });

        res.on('end', () => {
          file.end();
          file.on('finish', resolve);
        });

        res.on('error', (err) => {
          file.close();
          reject(err);
        });
      }).on('error', reject);
    }

    doRequest(url);
  });
}

async function checkForUpdates() {
  const data = await httpsGet(GITHUB_API);
  const releases = JSON.parse(data.toString());

  // Find the latest release with a self-hostable zip asset
  let bestRelease = null;
  let bestAsset = null;

  for (const release of releases) {
    if (release.draft) continue;
    const asset = (release.assets || []).find(a => a.name.includes('self-hostable') && a.name.endsWith('.zip'));
    if (asset) {
      bestRelease = release;
      bestAsset = asset;
      break; // releases are sorted newest first
    }
  }

  // If no release has assets, try to use zipball of latest non-prerelease
  if (!bestRelease) {
    for (const release of releases) {
      if (!release.draft && !release.prerelease) {
        bestRelease = release;
        break;
      }
    }
    if (!bestRelease && releases.length > 0) {
      bestRelease = releases[0];
    }
  }

  if (!bestRelease) {
    return { hasUpdate: false, remoteVersion: 'unknown' };
  }

  const localVersion = getLocalVersion();
  const remoteVersion = bestRelease.tag_name;
  const hasUpdate = localVersion === 'none' || localVersion !== remoteVersion;

  return {
    hasUpdate,
    remoteVersion,
    downloadUrl: bestAsset ? bestAsset.browser_download_url : bestRelease.zipball_url,
    isZipball: !bestAsset,
    tag: bestRelease.tag_name
  };
}

async function downloadUpdate(onProgress) {
  ensureDirs();

  const updateInfo = await checkForUpdates();
  if (!updateInfo.downloadUrl) throw new Error('Не найден URL для загрузки');

  const zipPath = path.join(DOWNLOAD_DIR, 'update.zip');

  // Download
  await httpsDownload(updateInfo.downloadUrl, zipPath, onProgress);

  // Clear old site
  if (fs.existsSync(SITE_DIR)) {
    fs.rmSync(SITE_DIR, { recursive: true, force: true });
    fs.mkdirSync(SITE_DIR, { recursive: true });
  }

  // Extract
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  // Find the root directory inside zip (if any)
  let prefix = '';
  if (entries.length > 0) {
    const firstEntry = entries[0].entryName;
    if (firstEntry.endsWith('/')) {
      prefix = firstEntry;
    } else if (firstEntry.includes('/')) {
      prefix = firstEntry.split('/')[0] + '/';
    }
    // Verify it's a common prefix
    const allMatch = entries.every(e => e.entryName.startsWith(prefix));
    if (!allMatch) prefix = '';
  }

  for (const entry of entries) {
    let relativePath = entry.entryName;
    if (prefix && relativePath.startsWith(prefix)) {
      relativePath = relativePath.substring(prefix.length);
    }
    if (!relativePath) continue;

    const fullPath = path.join(SITE_DIR, relativePath);

    if (entry.isDirectory) {
      fs.mkdirSync(fullPath, { recursive: true });
    } else {
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, entry.getData());
    }
  }

  // Clean up download
  try { fs.unlinkSync(zipPath); } catch {}

  // Save version
  saveLocalVersion(updateInfo.remoteVersion, updateInfo.tag);
}

module.exports = { checkForUpdates, downloadUpdate, getLocalVersion, isFirstRun, SITE_DIR };
