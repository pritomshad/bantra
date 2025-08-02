// Transcription button press
const transcripButton = document.getElementById("transciption-button");
let generatedTextContainer = document.getElementById('generated-text');
const refreshButton = document.getElementById('refresh-button');

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
    window.bantraAPI.refresh();
    // some function to process the transcript and save the note
  }
});

/**
 * After pressing generate note button this sends
 * `make-note` ipc message to main. generateNoteButton should
 * not be clicked more than once. Add this functionality in future updates.
 */
// const generateNoteButton = document.getElementById('generate-note-button');

// generateNoteButton.addEventListener('click', async () => {
//   console.log('Generate note button clicked');
//   await window.ollamaAPI.makeNote();
// });

let textBuffer = "";

window.bantraAPI.onInference((token) => {
  textBuffer += token;
  const htmlContent = marked.parse(textBuffer);
  generatedTextContainer.innerHTML = htmlContent;
});

window.bantraAPI.onInferenceDone((filename) => {
  console.log("Inference done, saving text buffer");


  // Save the text buffer to a file
  // Filename will be in this format: The "title_from_textBuffer - YYYY-MM-DD_HH-MM-SS.md"
  let title = textBuffer.split('\n')[0] || "Generated Note";
  title = title.replace(/[^a-zA-Z0-9 ]/g, ''); // Remove special characters
  title = title.trim().replace(/\s+/g, '-'); // Replace spaces with hyphens
  title = title + "." + filename.split('.')[0] + ".md";

  window.bantraAPI.saveTextBuffer(textBuffer, title);
});

// Refresh button refreshes if new notes are transcribed
refreshButton.addEventListener('click', () => {
  generatedTextContainer.innerHTML = "";
  window.bantraAPI.refresh();
});


// Listing all files in the transcript directory

window.addEventListener("DOMContentLoaded", async () => {
  const container = document.createElement("div");
  container.style.maxWidth = "1080px";
  container.style.margin = "2rem auto";
  container.style.width = "90%";
  container.style.fontFamily = "Segoe UI, sans-serif";

  const files = await window.bantraAPI.getTranscriptFiles();

  files.forEach(file => {
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "1.5rem";
    wrapper.style.padding = "1rem";
    wrapper.style.border = "1px solid #ccc";
    wrapper.style.borderRadius = "8px";
    wrapper.style.maxWidth = "1080px";
    // wrapper should take full width of the screen
    wrapper.style.width = "100%";
    wrapper.style.backgroundColor = "#f8f8f8";

    const filename = document.createElement("p");
    filename.textContent = "Date: " + file.split('.')[0].split('_')[0] + " Time: " + file.split('.')[0].split('_')[1];
    filename.style.marginBottom = "0.5rem";
    filename.style.fontWeight = "bold";

    const btn = document.createElement("button");

    // Open transcript button
    const openTranscriptButton = document.createElement("button");
    openTranscriptButton.textContent = "Open Transcript";
    openTranscriptButton.style.marginRight = "0.5rem";
    openTranscriptButton.style.padding = "0.5rem 1rem";
    openTranscriptButton.style.backgroundColor = "#00d4b8ff";
    openTranscriptButton.style.color = "white";
    openTranscriptButton.style.border = "none";

    // Delete transcript button
    const deleteTranscriptButton = document.createElement("button");
    deleteTranscriptButton.textContent = "Delete Transcript";
    deleteTranscriptButton.style.padding = "0.5rem 1rem";
    deleteTranscriptButton.style.backgroundColor = "#ff4d4d";
    deleteTranscriptButton.style.color = "white";
    deleteTranscriptButton.style.border = "none";

    openTranscriptButton.addEventListener("click", () => {
      // Reusing the Notes Window to show the transcript
      window.bantraAPI.openNotesWindow(file);
    });
    
    deleteTranscriptButton.addEventListener("click", () => {
      // Delete the transcript file
      window.bantraAPI.deleteTranscriptFile(file)
        .then(() => {
          console.log(`Transcript file ${file} deleted successfully.`);
          // Refresh the list of transcript files
          window.bantraAPI.refresh();
        })
        .catch((error) => {
          console.error(`Error deleting transcript file ${file}:`, error);
        }
      );
    });

    const generatedNote = document.createElement("p");

    if (file.endsWith(".FALSE_TRAX.txt")) {
      btn.textContent = "Generate Note";
      btn.style.padding = "0.5rem 1rem";
      btn.style.backgroundColor = "#0078d4";
      btn.style.color = "white";
      btn.style.border = "none";
      btn.style.borderRadius = "5px";
      btn.style.cursor = "pointer";

      generatedNote.textContent = "Note will be generated here.";

      btn.addEventListener("click", () => {
        // console.log(generatedTextContainer);
        generatedTextContainer = generatedNote;
        // console.log(generatedTextContainer);
        window.ollamaAPI.makeNote(file);
        btn.textContent = "Generating Note...";
        btn.disabled = true; // Disable the button after clicking
      });
      
    } else {
      btn.textContent = "Note Already Generated";
      btn.style.padding = "0.5rem 1rem";
      btn.style.backgroundColor = "#686868ff";
      btn.style.color = "white";
      btn.style.border = "none";
      btn.style.borderRadius = "5px";
      btn.style.cursor = "pointer";
      btn.disabled = true; // Disable the button if the note is already generated
    }

    wrapper.appendChild(filename);
    wrapper.appendChild(btn);
    wrapper.appendChild(openTranscriptButton);
    wrapper.appendChild(deleteTranscriptButton);
    wrapper.appendChild(generatedNote);
    container.appendChild(wrapper);
  });

  // Show generated notes
  const generatedNoteDivContainer = document.createElement("div");
  generatedNoteDivContainer.style.marginTop = "2rem";
  generatedNoteDivContainer.innerHTML = "<h2>Generated Notes</h2>";
  container.style.fontFamily = "Segoe UI, sans-serif";

  const notes = await window.bantraAPI.getNoteFiles();
  notes.forEach(note => {
    const showNoteButton = document.createElement("button");
    showNoteButton.textContent = note;
    showNoteButton.style.margin = "0.5rem";
    showNoteButton.style.padding = "0.5rem 1rem";
    showNoteButton.style.backgroundColor = "#00d47cff";
    showNoteButton.style.color = "white";
    showNoteButton.style.border = "none";
    showNoteButton.style.cursor = "pointer";

    showNoteButton.addEventListener("click", async () => {
      window.bantraAPI.openNotesWindow(note);
    });

    generatedNoteDivContainer.appendChild(showNoteButton);
  });

  document.body.appendChild(container);
  document.body.appendChild(generatedNoteDivContainer);
});
