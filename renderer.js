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

/**
 * After pressing generate note button this sends
 * `make-note` ipc message to main. generateNoteButton should
 * not be clicked more than once. Add this functionality in future updates.
 */
const generateNoteButton = document.getElementById('generate-note-button');

generateNoteButton.addEventListener('click', async () => {
  console.log('Generate note button clicked');
  await window.ollamaAPI.makeNote();
});

let textBuffer = "";
const generatedTextContainer = document.getElementById('generated-text');

window.bantraAPI.onInference((token) => {
  textBuffer += token;
  generatedTextContainer.innerText = textBuffer;
});