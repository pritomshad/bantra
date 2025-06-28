// Transcription button press
const transcripButton = document.getElementById("transciption-button");

transcripButton.addEventListener("click", () => {
  //   console.log(transcripButton.value);
  if (transcripButton.value == "1") {
    transcripButton.innerText = "STOP TRANSCRIPTION";
    transcripButton.value = "0";
    window.bantraAPI.onTranscriptionButtonPress(1);
  } else {
    transcripButton.innerText = "START TRANSCRIPTION";
    transcripButton.value = "1";
    window.bantraAPI.onTranscriptionButtonPress(0);
    // some function to process the transcript and save the note
  }
});
