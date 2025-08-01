const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld('bantraAPI', {
  onPythonStdOut: (callback) => 
    ipcRenderer.on('py-message', (_event, value) => callback(value)),
  onTranscriptionButtonPress: (k) => {
    if (k == 1) ipcRenderer.send("start-transcription");
    else ipcRenderer.send("stop-transcription");
  },
  onInference: (callback) => ipcRenderer.on("inference", (_event, token) => callback(token)),
  onInferenceDone: (callback) => ipcRenderer.on("inference-done", (_event, filename) => callback(filename)),
  saveTextBuffer: (buffer, filename) => ipcRenderer.invoke('save-text-buffer', buffer, filename),
  getTranscriptFiles: () => ipcRenderer.invoke('get-transcript-files'),
  getNoteFiles: () => ipcRenderer.invoke('get-note-files'),
  openNotesWindow: (note) => ipcRenderer.send('open-notes-window', note),
  onGettingNoteContentForNotesWindow: (callback) => 
    ipcRenderer.on("note-content", (_event, content) => callback(content)),
  refresh: () => ipcRenderer.send('refresh')
})

contextBridge.exposeInMainWorld('ollamaAPI', {
  makeNote: (filename) => ipcRenderer.invoke("ollama-make-note", filename)
});