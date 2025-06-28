// Transcription button press
const transcripButton = document.getElementById("transciption-button");

transcripButton.addEventListener("click", () => {
  if (transcripButton.value == "1") {
    transcripButton.innerText = "STOP";
    transcripButton.value = "0";
    window.bantraAPI.onStartTranscription();
  } else {
    transcripButton.innerText = "START TRANSCRIPTION";
    transcripButton.value = "1";

    // some function to process the transcript and save the note

    /**
     * On stop transcription the caption window is closed and python process is killed
     */
    window.bantraAPI.onStopTranscription();
  }
});
