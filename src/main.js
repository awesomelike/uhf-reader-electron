const {
  app, BrowserWindow, Tray, Menu, dialog, ipcMain,
} = require('electron');
const path = require('path');
const electronLog = require('electron-log');
const storage = require('electron-json-storage');

// This will check for available updates
require('update-electron-app')({
  logger: electronLog,
  updateInterval: '10m',
});

require('./server');
const uhf = require('./server/events');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const isDev = () => process.env.npm_lifecycle_event === 'start';

let mainWindow = null;
let tray = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      webSecurity: false,
    },
  });

  try {
    const trayIconPath = isDev()
      ? path.join(__dirname, '../../src/assets/icons/Icon.ico')
      : path.join(__dirname, './icons/Icon.ico');

    tray = new Tray(trayIconPath);

    tray.on('double-click', () => {
      mainWindow.show();
    });
  } catch (error) {
    console.log(error);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click() {
        mainWindow.show();
      },
    },
    {
      label: 'Quit',
      click() {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // eslint-disable-next-line no-undef
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.on('ready-to-show', () => mainWindow.show());
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }

    return false;
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('mounted', () => {
  // See if there is stored successful data
  storage.get('connectionData', (error, data) => {
    if (error) {
      throw error;
    }
    if (data) {
      const { ip, port } = data;
      mainWindow.webContents.send('connectionData', ip, port);
    }
  });
});

uhf.on('uhfConnected', (ip, port) => {
  mainWindow.webContents.send('uhfConnected');
  storage.set('connectionData', { ip, port }, (error) => {
    if (error) throw error;
  });
});

uhf.on('uhfTimeout', () => {
  mainWindow.webContents.send('uhfTimeout');
  dialog.showErrorBox('Error', 'Connection timeout! Please check the input!');
});
