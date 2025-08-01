let noteContainer = document.getElementById("note-container");
noteContainer.innerHTML = "Loading note content...";

window.bantraAPI.onGettingNoteContentForNotesWindow((content) => {
  console.log("Received note content for notes window:", content);
  noteContainer.innerHTML = marked.parse(content);
});
