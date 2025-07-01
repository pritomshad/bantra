const { app, net, BrowserWindow, ipcMain, screen } = require("electron/main");
const { spawn } = require("child_process");
const path = require("node:path");
const fs = require("fs");

let captionWindow = null;

const createWindow = () => {
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  /**
   * Send request using `net` to ollama with payload. You have to have ollama
   * installed in system. Currently it is using llama3.2. It is open in
   * http://localhost:11434 by default.
   * Each time ollama responds with a `token` it is sent to renderer
   */
  let isProcessing = false;

  ipcMain.handle("ollama-make-note", async () => {
    console.log("from main: ollama activated...");
    if (isProcessing) {
      return;
    }

    request = net.request({
      method: "POST",
      protocol: "http",
      hostname: "localhost",
      port: 11434,
      path: "/api/generate",
    });

    request.setHeader("Content-Type", "application/json");
    request.on("response", (_response) => {
      _response.on("data", (chunk) => {
        let parsed_json = JSON.parse(chunk.toString());
        if (parsed_json.done) {
          // When ollama finishes sending tokens parsed_json.done becomes true
          win.webContents.send("inference-done");
        }
        // Each token is sent to renderer
        win.webContents.send("inference", parsed_json.response);
      });
    });

    /**
     * @JACsadi replace output.txt with the trancript text file from
     * meeting recording. The response is better with a good prompt.
     * Write a better prompt ig.
     */
    const text_content = fs.readFileSync(
      path.join(__dirname, "output.txt"),
      "utf8"
    );
    const payload = JSON.stringify({
      model: "llama3.2",
      prompt: `You are a Class Note Generator who is very good at making well organised notes from raw class lecture transcript.
      Given the following transcript make a note :
      
      Raw Class Lecture Transcript:
      ${text_content}
      
      Respond with Markdown`,
      stream: true,
    });

    request.write(payload);
    request.end();
  });

  win.loadFile("index.html");
  win.webContents.openDevTools();
};

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
  let dython = null;
  // Trancription start got positive signal
  const startTranscription = () => {
    // const transcripButton = document.getElementById("transciption-button");
    // if (transcripButton.value == "1") {
    console.log("start-transcript: initialized");
    python = spawn("python", ["asr.py"]);
    dython = spawn("python", ["record_audio.py"]);
    python.stdout.on("data", (data) => {
      console.log(`Python: ${data.toString()}`);
      try {
        const output = JSON.parse(data.toString());
        captionWindow.webContents.send("py-message", output.text);
      } catch (err) {
        console.log("error: ", err);
      }
    });
    dython.stdout.on("data", (data) => {
      console.log(`Python: ${data.toString()}`);
    });
    // }
  };

  startTranscription();

  // When the window is closed, kill the Python process if running
  captionWindow.on("closed", () => {
    if (python) {
      python.kill();
      dython.kill();
      dython = null;
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
