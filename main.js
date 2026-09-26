const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { startServer, stopServer } = require('./src/server');
const { checkForUpdates, downloadUpdate, getLocalVersion, isFirstRun } = require('./src/updater');

let mainWindow;
let splashWindow;
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

function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'BrickCode Offline',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

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
    const localVersion = getLocalVersion();

    sendToSplash('status', firstRun
      ? 'Первый запуск. Скачивание BrickCode...'
      : `Текущая версия: ${localVersion}. Проверка обновлений...`);

    // Check for updates
    let needsDownload = firstRun;
    try {
      const updateInfo = await checkForUpdates();
      if (updateInfo.hasUpdate) {
        sendToSplash('status', `Доступна новая версия: ${updateInfo.remoteVersion}`);
        needsDownload = true;
      } else if (!firstRun) {
        sendToSplash('status', 'Версия актуальна');
      }
    } catch (err) {
      console.log('Update check failed:', err.message);
      if (firstRun) {
        sendToSplash('status', 'Нет интернета. Невозможно скачать BrickCode.');
        dialog.showErrorBox('BrickCode Offline',
          'Для первого запуска требуется подключение к интернету для загрузки редактора.');
        app.quit();
        return;
      }
      sendToSplash('status', 'Нет интернета. Используется локальная версия.');
    }

    // Download if needed
    if (needsDownload) {
      sendToSplash('status', 'Загрузка BrickCode...');
      await downloadUpdate((progress) => {
        sendToSplash('progress', progress);
        sendToSplash('status', `Загрузка: ${progress}%`);
      });
      sendToSplash('status', 'Распаковка...');
    }

    // Start local server
    sendToSplash('status', 'Запуск локального сервера...');
    serverPort = await startServer();

    // Wait a bit for the server to be ready
    await new Promise(r => setTimeout(r, 500));

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
