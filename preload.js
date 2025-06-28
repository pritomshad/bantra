const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("bantraAPI", {
  onPythonStdOut: (callback) =>
    ipcRenderer.on("py-message", (_event, value) => callback(value)),
  onStartTranscription: () => ipcRenderer.send("start-transcription"),
  onStopTranscription: () => ipcRenderer.send("stop-transcription")
});
