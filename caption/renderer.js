// Show the captions generated from asr.py

let prevText = ''

window.bantraAPI.onPythonStdOut((text) => {
    const captionContainer1 = document.getElementById('caption-line-1')
    const captionContainer2 = document.getElementById('caption-line-2')
    captionContainer1.innerText = prevText
    captionContainer2.innerText = text
    prevText = text
})