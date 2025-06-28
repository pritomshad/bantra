const { app, BrowserWindow, ipcMain, screen } = require("electron/main");
const { spawn } = require("child_process");
const path = require("node:path");

const createWindow = () => {
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");
  win.webContents.openDevTools();
};
let captionWindow = null;
const createCaptionWindow = () => {
  const display = screen.getPrimaryDisplay();
  const screenWidth = display.bounds.width;
  const screenHeight = display.bounds.height;
  const windowWidth = 800;
  const windowHeight = 200;

  captionWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: (screenWidth - windowWidth) / 2,
    y: screenHeight - windowHeight - 30,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  let python = null;

  // Trancription start got positive signal
  const startTranscription = () => {
    // const transcripButton = document.getElementById("transciption-button");
    // if (transcripButton.value == "1") {
    console.log("start-transcript: initialized");
    python = spawn("python", ["asr.py"]);

    python.stdout.on("data", (data) => {
      console.log(`Python: ${data.toString()}`);
      try {
        const output = JSON.parse(data.toString());
        captionWindow.webContents.send("py-message", output.text);
      } catch (err) {
        console.log("error: ", err);
      }
    });
    // }
  };

  startTranscription();

  // When the window is closed, kill the Python process if running
  captionWindow.on("closed", () => {
    if (python) {
      python.kill();
      python = null;
    }
  });

  captionWindow.loadFile(path.join(__dirname, "caption", "caption.html"));
};
const closeCaptionWindow = () => {
  if (captionWindow && !captionWindow.isDestroyed()) {
    captionWindow.close();
    captionWindow = null;
  }
};
app.on("ready", () => {
  createWindow();

  ipcMain.on("start-transcription", () => {
    createCaptionWindow();
  });
  ipcMain.on("stop-transcription", () => {
    closeCaptionWindow();
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
