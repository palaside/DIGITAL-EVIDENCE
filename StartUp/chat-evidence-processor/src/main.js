const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function ignorePipeErrors(stream) {
  if (!stream || typeof stream.on !== "function") {
    return;
  }

  stream.on("error", (error) => {
    if (!error) {
      return;
    }
    if (error.code === "EPIPE") {
      return;
    }
  });
}

ignorePipeErrors(process.stdout);
ignorePipeErrors(process.stderr);

function safeWriteLine(message) {
  try {
    if (!process.stdout || process.stdout.destroyed || process.stdout.writableEnded) {
      return;
    }
    process.stdout.write(`${message}\n`);
  } catch (error) {
    return;
  }
}

function createWindow() {
  const isTest = process.argv.includes("--test");

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Chat Evidence Processor",
    show: true, // Keep shown to ensure canvas/image rendering is not throttled
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      additionalArguments: isTest ? ["--test"] : [], // Forward test flag to renderer
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  
  // Open DevTools if not in test mode
  if (!isTest) {
    mainWindow.webContents.openDevTools();
  }

  // Forward renderer console logs only in test mode so the GUI path stays stable.
  if (isTest) {
    mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
      safeWriteLine(`[Renderer Console] ${message}`);
    });
  }
}

// IPC channel for headless test verification
ipcMain.on("test-done", (event, exitCode) => {
  safeWriteLine(`Test finished with exit code: ${exitCode}`);
  app.exit(exitCode);
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
