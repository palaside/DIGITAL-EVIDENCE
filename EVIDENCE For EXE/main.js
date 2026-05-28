// Electron Main Process
// Manages application lifecycle, window parameters, and desktop menu context

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  // Create the premium desktop window
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#030213', // Dark theme matching background to prevent white screen flashes!
    show: false, // Don't show until ready-to-show
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    // Set standard window logo or default shield emblem icon if available
    icon: path.join(__dirname, 'dist', 'assets', '_______________-_Copy-1-Dt0gs8Ti.png')
  });

  // Load the built Vite React index.html
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Reveal the window only when fully compiled and ready to prevent flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Custom premium application menu
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Forensics',
      submenu: [
        {
          label: 'Active Notebook: หลักฐานดิจิทัล',
          enabled: false
        },
        {
          label: 'ID: 4ebd1ce5-dba7-4c90-a0cc-6c9ae0ac6af9',
          enabled: false
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers can be placed here if needed
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
