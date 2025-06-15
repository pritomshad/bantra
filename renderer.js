// Transcription button press
const transcripButton = document.getElementById('transciption-button')

transcripButton.addEventListener('click', () => {
    window.bantraAPI.onTranscriptionButtonPress()
})


// Show the captions generated from asr.py
window.bantraAPI.onPythonStdOut((text) => {
    const transcript = document.getElementById('caption')
    transcript.innerText = text
})