const { app, BrowserWindow, ipcMain } = require('electron/main')
const { spawn } = require("child_process")
const path = require('node:path')

const createWindow = () => {
    const win = new BrowserWindow({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // Trancription start got positive signal
    ipcMain.on('start-transcription', (_event) => {
        console.log("start-transcript: initialized")
        const python = spawn("python", ["asr.py"])

        python.stdout.on('data', (data) => {
            console.log(`Python: ${data.toString()}`)
            try {
                const output = JSON.parse(data.toString())
                win.webContents.send('py-message', output.text)
            } catch (err) {
                console.log("error: ", err)
            }
        })
    })

    win.loadFile('index.html')
    win.webContents.openDevTools()
}

app.on('ready', () => {
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()

            
        }
    })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})