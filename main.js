/**
 * Bantra - A tool for generating class notes from lecture transcripts. Also a live captioning tool.
 * It uses Electron for the desktop application, Python for ASR, and Ollama for note generation.
 * This file is the main process of the Electron application.
 * It handles the creation of windows, IPC communication, and integration with Python scripts.
 * 
 * 
 * @author pritomash
 * @author JACsadi
 * @version 1.0.0
 * @license MIT
 */


const { app, net, BrowserWindow, ipcMain, screen } = require("electron/main");
const { spawn } = require("child_process");
const path = require("node:path");
const fs = require("fs");

let captionWindow = null;
let transcriptionRunning = true;

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

  ipcMain.handle("ollama-make-note", async (_event, filename) => {
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
        console.log(parsed_json);
        if (parsed_json.done) {
          // When ollama finishes sending tokens parsed_json.done becomes true
          // console.log(222);

          // rename the txt file
          let newFilename = filename.split(".")[0] + ".TRUE_TRAX.txt";
          fs.renameSync(
            path.join(__dirname, filename), 
            path.join(__dirname, newFilename)
          );
          
          win.webContents.send("inference-done", filename);
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
      path.join(__dirname, filename),
      "utf8"
    );
    const payload = JSON.stringify({
      model: "llama3.2",
      prompt: `You are a Class Note Generator who is very good at making well organised notes from raw class lecture transcript.
      The notes should be well structured, with headings, subheadings, bullet points, and other formatting as needed. The first
      line of the note should not have any formatting.
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
  // win.webContents.openDevTools();
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

  // Trancription start got positive signal
  const startTranscription = () => {
    // const transcripButton = document.getElementById("transciption-button");
    console.log("start-transcript: initialized");
    const rundython = () => {
      if (!transcriptionRunning) return;

      python = spawn("python", ["asr.py"]);

      // dython = spawn("python", ["device.py"]);
      python.stdout.on("data", (data) => {
        console.log(`Python: ${data.toString()}`);
        try {
          const output = JSON.parse(data.toString());
          captionWindow.webContents.send("py-message", output.text);
        } catch (err) {
          console.log("error: ", err);
        }
      });
      // dython.stdout.on("data", (data) => {
      //   console.log(`Python: ${data.toString()}`);
      // });
      python.on("exit", (code, signal) => {
        console.log(
          `Python process exited with code ${code} and signal ${signal}`
        );
        python = null;
        //when our python script exit after no audio detection, if we havent stopped transcriop, it restarts
        if (transcriptionRunning) {
          console.log("Restarting transcription...");
          setTimeout(rundython, 1000);
          // restart
        }
      });
    };
    rundython();
    // }
  };

  startTranscription();

  // When the window is closed, kill the Python process if running
  captionWindow.on("closed", () => {
    transcriptionRunning = false;
    if (python) {
      python.kill();
      // dython.kill();
      python = null;
    }
  });

  captionWindow.loadFile(path.join(__dirname, "caption", "caption.html"));
};
const closeCaptionWindow = () => {
  if (captionWindow && !captionWindow.isDestroyed()) {
    captionWindow.close();
    captionWindow = null;
    let txtfile = null;
    // console.log(11);
    txtfile = spawn("python", ["generating_txtfile.py"]);
    txtfile.stdout.on("data", (data) => {
      console.log(`Python Tranx: ${data.toString()}`);
    });
  }
};

const createNotesWindow = (note) => {
  notesWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // 'note' is the filename of the note to be opened
  let textContent = "";
  textContent = fs.readFileSync(path.join(__dirname, note), "utf8");
  console.log(textContent);

  // notesWindow.webContents.send("note-content", textContent);
  console.log("Sent note content to notes window");

  notesWindow.loadFile(path.join(__dirname, "notes-window", "notes-window.html"))
  .then(() => {
    console.log("Notes window loaded successfully");
    notesWindow.webContents.send("note-content", textContent);
  });
  // notesWindow.webContents.openDevTools();
};

app.on("ready", () => {
  createWindow();

  ipcMain.on("start-transcription", () => {
    transcriptionRunning = true;
    createCaptionWindow();
  });
  ipcMain.on("stop-transcription", () => {
    closeCaptionWindow();
  });
  ipcMain.on("open-notes-window", (_event, note) => {
    createNotesWindow(note);
  });
  ipcMain.on("refresh", () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.reload();
    }
  });

  ipcMain.handle('save-text-buffer', async (_event, buffer, filename) => {
    console.log("Saving text buffer to file:", filename);
    fs.writeFileSync(filename, buffer, 'utf-8');
  });

  ipcMain.handle('delete-transcript-file', async (_event, filename) => {
    console.log("Deleting transcript file:", filename);
    const filePath = path.join(__dirname, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("File deleted successfully");
    } else {
      console.error("File does not exist:", filePath);
      throw new Error(`File not found: ${filePath}`);
    }
  });

  const transcriptDir = __dirname;

  ipcMain.handle("get-transcript-files", async () => {
    const files = fs.readdirSync(transcriptDir)
      .filter(name => name.endsWith("_TRAX.txt"))
      .map(name => ({
        name,
        time: fs.statSync(path.join(transcriptDir, name)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time) // Sort by modification time (descending)
      .map(file => file.name); // Return only the file names

    return files;
  });

  ipcMain.handle("get-note-files", async () => {
    const files = fs.readdirSync(transcriptDir)
      .filter(name => name.endsWith(".md"))
      .map(name => ({
        name,
        time: fs.statSync(path.join(transcriptDir, name)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time) // Sort by modification time (descending)
      .map(file => file.name); // Return only the file names

    return files;
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
