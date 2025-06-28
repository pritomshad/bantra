const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("bantraAPI", {
  onPythonStdOut: (callback) =>
    ipcRenderer.on("py-message", (_event, value) => callback(value)),
  onStartTranscription: () => ipcRenderer.send("start-transcription"),
  onStopTranscription: () => ipcRenderer.send("stop-transcription"),
  onInference: (callback) => ipcRenderer.on("inference", (_event, token) => callback(token)),
  onInferenceDone: (callback) => ipcRenderer.on("inference-done", () => callback())
});

contextBridge.exposeInMainWorld('ollamaAPI', {
  makeNote: () => ipcRenderer.invoke("ollama-make-note")
});