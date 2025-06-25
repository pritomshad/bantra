// Transcription button press
const transcripButton = document.getElementById('transciption-button')

transcripButton.addEventListener('click', () => {
    window.bantraAPI.onTranscriptionButtonPress()
})