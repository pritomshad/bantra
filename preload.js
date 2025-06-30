const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld('bantraAPI', {
  onPythonStdOut: (callback) => 
    ipcRenderer.on('py-message', (_event, value) => callback(value)),
  onTranscriptionButtonPress: (k) => {
    if (k == 1) ipcRenderer.send("start-transcription");
    else ipcRenderer.send("stop-transcription");
  },
  onInference: (callback) => ipcRenderer.on("inference", (_event, token) => callback(token)),
  onInferenceDone: (callback) => ipcRenderer.on("inference-done", () => callback())
})