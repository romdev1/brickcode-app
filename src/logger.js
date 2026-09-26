const fs = require('fs');
const path = require('path');
const { app, ipcMain, shell } = require('electron');

let logFilePath = null;
const memoryLogs = [];
const MAX_LOGS = 2000;
let logsWindow = null;

function initLogger(userDataPath) {
  const logsDir = path.join(userDataPath, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  logFilePath = path.join(logsDir, 'brickcode.log');

  // Rotate log if it's larger than 5MB
  if (fs.existsSync(logFilePath)) {
    try {
      const stat = fs.statSync(logFilePath);
      if (stat.size > 5 * 1024 * 1024) {
        const backup = path.join(logsDir, 'brickcode-prev.log');
        if (fs.existsSync(backup)) fs.unlinkSync(backup);
        fs.renameSync(logFilePath, backup);
      }
    } catch {}
  }
}

function setLogsWindow(win) {
  logsWindow = win;
}

function addLog(level, category, message, details = null) {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
  const dateStr = now.toISOString().split('T')[0];

  const entry = {
    id: Date.now() + Math.random(),
    time: timeStr,
    date: dateStr,
    timestamp: now.getTime(),
    level: level.toUpperCase(), // INFO, WARN, ERROR, DEBUG
    category: category.toUpperCase(), // APP, SERVER, SERIAL, UPDATER
    message: typeof message === 'string' ? message : JSON.stringify(message),
    details: details ? (typeof details === 'string' ? details : JSON.stringify(details, null, 2)) : null
  };

  memoryLogs.push(entry);
  if (memoryLogs.length > MAX_LOGS) {
    memoryLogs.shift();
  }

  // Write to log file
  if (logFilePath) {
    const fileLine = `[${entry.date} ${entry.time}] [${entry.level}] [${entry.category}] ${entry.message}${entry.details ? ' ' + entry.details : ''}\n`;
    fs.appendFile(logFilePath, fileLine, () => {});
  }

  // Send to open logs window in real-time
  if (logsWindow && !logsWindow.isDestroyed()) {
    logsWindow.webContents.send('log-entry', entry);
  }

  return entry;
}

const logger = {
  init: initLogger,
  setLogsWindow,
  info: (cat, msg, details) => addLog('INFO', cat, msg, details),
  warn: (cat, msg, details) => addLog('WARN', cat, msg, details),
  error: (cat, msg, details) => addLog('ERROR', cat, msg, details),
  debug: (cat, msg, details) => addLog('DEBUG', cat, msg, details),
  serial: (msg, details) => addLog('INFO', 'SERIAL', msg, details),
  server: (msg, details) => addLog('INFO', 'SERVER', msg, details),
  updater: (msg, details) => addLog('INFO', 'UPDATER', msg, details),
  getLogs: () => memoryLogs,
  clearLogs: () => {
    memoryLogs.length = 0;
    if (logFilePath) {
      fs.writeFile(logFilePath, '', () => {});
    }
  },
  getLogFilePath: () => logFilePath
};

module.exports = logger;
