const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { startServer, stopServer } = require('./src/server');
const { checkForUpdates, downloadUpdate, getLocalVersion, isFirstRun, installBundledSite } = require('./src/updater');

let mainWindow;
let splashWindow;
let serialPickerWindow = null;
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

function openSerialPicker(portList, callback) {
  currentSerialCallback = callback;
  currentPortList = portList || [];

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
  if (currentSerialCallback) {
    currentSerialCallback(portId);
    currentSerialCallback = null;
  }
  if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
    serialPickerWindow.close();
  }
});

ipcMain.on('serial-port-cancelled', () => {
  if (currentSerialCallback) {
    currentSerialCallback('');
    currentSerialCallback = null;
  }
  if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
    serialPickerWindow.close();
  }
});

ipcMain.on('refresh-serial-ports', () => {
  if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
    serialPickerWindow.webContents.send('ports-list', currentPortList);
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
    if (!currentPortList.some(p => p.portId === port.portId)) {
      currentPortList.push(port);
    }
    if (serialPickerWindow && !serialPickerWindow.isDestroyed()) {
      serialPickerWindow.webContents.send('ports-list', currentPortList);
    }
  });

  mainWindow.webContents.session.on('serial-port-removed', (event, port) => {
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
  createSplashWindow();

  try {
    const firstRun = isFirstRun();

    // 1. If first run, extract bundled site files so app is immediately usable offline
    if (firstRun) {
      sendToSplash('status', 'Первый запуск. Подготовка файлов редактора...');
      await installBundledSite((progress) => {
        sendToSplash('progress', progress);
        sendToSplash('status', `Распаковка файлов: ${progress}%`);
      });
    }

    const localVersion = getLocalVersion();
    sendToSplash('status', `Версия: ${localVersion}. Проверка обновлений...`);

    // 2. Check for updates on beta.brickcode.org & GitHub commits
    try {
      const updateInfo = await checkForUpdates();
      if (updateInfo.hasUpdate) {
        sendToSplash('status', `Доступно обновление (${updateInfo.remoteVersion}). Загрузка файлов...`);
        await downloadUpdate((progress) => {
          sendToSplash('progress', progress);
          sendToSplash('status', `Загрузка обновления: ${progress}%`);
        });
        sendToSplash('status', 'Файлы успешно обновлены!');
      } else {
        sendToSplash('status', 'У вас актуальная версия файлов.');
      }
    } catch (err) {
      console.log('Update check skipped (offline or network error):', err.message);
      sendToSplash('status', 'Офлайн-режим. Запуск локальной версии...');
    }

    // 3. Start local HTTP server
    sendToSplash('status', 'Запуск локального сервера...');
    serverPort = await startServer();

    // Short delay for server readiness
    await new Promise(r => setTimeout(r, 400));

    sendToSplash('status', 'Загрузка редактора...');
    createMainWindow(serverPort);

  } catch (err) {
    console.error('Launch error:', err);
    dialog.showErrorBox('Ошибка запуска', err.message);
    app.quit();
  }
}

app.whenReady().then(launch);

app.on('window-all-closed', () => {
  stopServer();
  app.quit();
});

app.on('before-quit', () => {
  stopServer();
});
