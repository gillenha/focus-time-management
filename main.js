const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Ensure this file exists or comment it out if not needed
      nodeIntegration: true, // Consider setting this to false for security
    },
  });

  // Load the index.html from the build directory
  win.loadFile(path.join(__dirname, 'build', 'index.html')); // This path should be correct
}

app.whenReady().then(createWindow);

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
