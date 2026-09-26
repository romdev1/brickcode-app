const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { startServer, stopServer } = require('./src/server');
const { checkForUpdates, downloadUpdate, getLocalVersion, isFirstRun, installBundledSite } = require('./src/updater');
const logger = require('./src/logger');

let mainWindow;
let splashWindow;
let serialPickerWindow = null;
let logsWindow = null;
let currentSerialCallback = null;
let currentPortList = [];
let serverPort;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 380,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  splashWindow.loadFile(path.join(__dirname, 'src', 'splash.html'));
}

function openLogsWindow() {
  if (logsWindow && !logsWindow.isDestroyed()) {
    logsWindow.focus();
    return;
  }

  logsWindow = new BrowserWindow({
    width: 860,
    height: 600,
    minWidth: 640,
    minHeight: 400,
    title: 'Журнал работы и логи — BrickCode Offline',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'src', 'logs-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  logger.setLogsWindow(logsWindow);
  logsWindow.loadFile(path.join(__dirname, 'src', 'logs-window.html'));
  logsWindow.setMenuBarVisibility(false);

  logger.info('APP', 'Окно журнала логов открыто пользователем');

  logsWindow.on('closed', () => {
    logsWindow = null;
    logger.setLogsWindow(null);
  });
}

function openSerialPicker(portList, callback) {
  currentSerialCallback = callback;
  currentPortList = portList || [];

  logger.serial(`Запрос выбора COM-порта (найдено устройств: ${currentPortList.length})`, currentPortList);

  if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
    serialPickerWindow.webContents.send('ports-list', currentPortList);
    serialPickerWindow.focus();
    return;
  }

  serialPickerWindow = new BrowserWindow({
    width: 560,
    height: 500,
    parent: mainWindow,
    modal: true,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'src', 'serial-picker-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  serialPickerWindow.loadFile(path.join(__dirname, 'src', 'serial-picker.html'));

  serialPickerWindow.once('ready-to-show', () => {
    serialPickerWindow.show();
    serialPickerWindow.webContents.send('ports-list', currentPortList);
  });

  serialPickerWindow.on('closed', () => {
    serialPickerWindow = null;
    if (currentSerialCallback) {
      currentSerialCallback('');
      currentSerialCallback = null;
    }
  });
}

// IPC handlers for Serial Picker
ipcMain.on('serial-port-selected', (event, portId) => {
  logger.serial(`Выбран COM-порт: ${portId}`);
  if (currentSerialCallback) {
    currentSerialCallback(portId);
    currentSerialCallback = null;
  }
  if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
    serialPickerWindow.close();
  }
});

ipcMain.on('serial-port-cancelled', () => {
  logger.serial('Выбор COM-порта отменён пользователем');
  if (currentSerialCallback) {
    currentSerialCallback('');
    currentSerialCallback = null;
  }
  if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
    serialPickerWindow.close();
  }
});

ipcMain.on('refresh-serial-ports', () => {
  logger.serial('Запрошено обновление списка портов');
  if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
    serialPickerWindow.webContents.send('ports-list', currentPortList);
  }
});

// IPC handlers for Logs Window
ipcMain.on('open-logs-window', () => {
  openLogsWindow();
});

ipcMain.handle('get-initial-logs', () => {
  return logger.getLogs();
});

ipcMain.on('clear-logs', () => {
  logger.clearLogs();
  logger.info('APP', 'Журнал логов очищен пользователем');
});

ipcMain.on('open-log-file', () => {
  const file = logger.getLogFilePath();
  if (file && fs.existsSync(file)) {
    shell.openPath(file);
  }
});

ipcMain.on('open-logs-folder', () => {
  const file = logger.getLogFilePath();
  if (file && fs.existsSync(file)) {
    shell.showItemInFolder(file);
  }
});

ipcMain.on('open-external', (event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
  }
});

function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'BrickCode Offline',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: false
    }
  });

  // Support Web Serial / Bluetooth communication with EV3
  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    openSerialPicker(portList, callback);
  });

  mainWindow.webContents.session.on('serial-port-added', (event, port) => {
    logger.serial(`Обнаружен новый порт: ${port.displayName || port.portName}`, port);
    if (!currentPortList.some(p => p.portId === port.portId)) {
      currentPortList.push(port);
    }
    if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
      serialPickerWindow.webContents.send('ports-list', currentPortList);
    }
  });

  mainWindow.webContents.session.on('serial-port-removed', (event, port) => {
    logger.serial(`Порт отключен: ${port.displayName || port.portName}`);
    currentPortList = currentPortList.filter(p => p.portId !== port.portId);
    if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
      serialPickerWindow.webContents.send('ports-list', currentPortList);
    }
  });

  mainWindow.webContents.session.setPermissionCheckHandler(() => true);
  mainWindow.webContents.session.setDevicePermissionHandler(() => true);

  mainWindow.loadURL(`http://localhost:${port}/`);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
    mainWindow.maximize();
    logger.info('APP', 'Главное окно редактора успешно открыто');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
      serialPickerWindow.close();
    }
  });
}

function sendToSplash(channel, data) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send(channel, data);
  }
}

async function launch() {
  logger.init(app.getPath('userData'));
  logger.info('APP', `Запуск BrickCode Offline (v${app.getVersion()})`);

  createSplashWindow();

  try {
    const firstRun = isFirstRun();

    // 1. If first run, extract bundled site files so app is immediately usable offline
    if (firstRun) {
      logger.info('APP', 'Первый запуск: распаковка вшитых файлов редактора');
      sendToSplash('status', 'Первый запуск. Подготовка файлов редактора...');
      await installBundledSite((progress) => {
        sendToSplash('progress', progress);
        sendToSplash('status', `Распаковка файлов: ${progress}%`);
      });
      logger.info('APP', 'Вшитые файлы редактора успешно распакованы');
    }

    const localVersion = getLocalVersion();
    logger.info('APP', `Текущая версия редактора: ${localVersion}`);
    sendToSplash('status', `Версия: ${localVersion}. Проверка обновлений...`);

    // 2. Check for updates on beta.brickcode.org & GitHub commits
    try {
      logger.updater('Проверка обновлений на beta.brickcode.org...');
      const updateInfo = await checkForUpdates();
      if (updateInfo.hasUpdate) {
        logger.updater(`Найдена новая версия: ${updateInfo.remoteVersion}. Запуск обновления...`);
        sendToSplash('status', `Доступно обновление (${updateInfo.remoteVersion}). Загрузка файлов...`);
        await downloadUpdate((progress) => {
          sendToSplash('progress', progress);
          sendToSplash('status', `Загрузка обновления: ${progress}%`);
        });
        logger.updater('Файлы успешно обновлены до последней версии');
        sendToSplash('status', 'Файлы успешно обновлены!');
      } else {
        logger.updater('Локальные файлы актуальны, обновление не требуется');
        sendToSplash('status', 'У вас актуальная версия файлов.');
      }
    } catch (err) {
      logger.warn('UPDATER', `Проверка обновлений пропущена (офлайн): ${err.message}`);
      sendToSplash('status', 'Офлайн-режим. Запуск локальной версии...');
    }

    // 3. Start local HTTP server
    sendToSplash('status', 'Запуск локального сервера...');
    serverPort = await startServer();
    logger.server(`Локальный сервер запущен на порту http://127.0.0.1:${serverPort}`);

    // Short delay for server readiness
    await new Promise(r => setTimeout(r, 400));

    sendToSplash('status', 'Загрузка редактора...');
    createMainWindow(serverPort);

  } catch (err) {
    logger.error('APP', `Ошибка запуска: ${err.message}`, err.stack);
    dialog.showErrorBox('Ошибка запуска', err.message);
    app.quit();
  }
}

app.whenReady().then(launch);

app.on('window-all-closed', () => {
  logger.info('APP', 'Все окна закрыты, завершение работы');
  stopServer();
  app.quit();
});

app.on('before-quit', () => {
  stopServer();
});
