// Transcription button press
const transcripButton = document.getElementById("transciption-button");

transcripButton.addEventListener("click", () => {
  //   console.log(transcripButton.value);
  if (transcripButton.value == "1") {
    transcripButton.innerText = "STOP";
    transcripButton.value = "0";
    window.bantraAPI.onTranscriptionButtonPress();
  } else {
    transcripButton.innerText = "START TRANSCRIPTION";
    transcripButton.value = "1";
    // some function to process the transcript and save the note
  }
});
