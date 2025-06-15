const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('bantraAPI', {
    onPythonStdOut: (callback) => ipcRenderer.on('py-message', (_event, value) => callback(value)),
    onTranscriptionButtonPress: () => ipcRenderer.send('start-transcription')
})