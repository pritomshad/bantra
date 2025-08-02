import pyaudiowpatch as pyaudio
import json
import speech_recognition as sr
from pydub import AudioSegment, silence

def chunking_audio():
    chunks = []
    audio =  AudioSegment.from_wav("output.wav")
    temp_chunks = silence.split_on_silence(
        audio,
        min_silence_len=700,
        silence_thresh=-30,
        keep_silence=150  # optional: keep 300ms of silence on edges
    )
    for chunk in temp_chunks:
        if(len(chunk) <= 15000):
            chunks.append(chunk)
        else:
            for i in range(0,len(chunk), 15000):
                end = len(chunk) if i + 15000 > len(chunk) else i + 15000
                new_chunk = chunk[i:end]
                chunks.append(new_chunk)
    
    return chunks

def generate_txt():
    recognizer = sr.Recognizer()
    chunks = chunking_audio()
    txt = ""
    for i,chunk in enumerate(chunks):
        # print(999)
        chunk_path = f"temp_chunk.wav"
        chunk.export(chunk_path, format="wav")
        # chunk_path.seek(0)
        # chunk.export(f"temp.wav", format="wav")
        with sr.AudioFile(chunk_path) as source:
            audio_data = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio_data, language='bn-BD')
            print(json.dumps({"text": text},ensure_ascii=False), flush=True)
        except Exception as e:
            text = ""
        txt += text
    with open("output.txt", "w", encoding="utf-8") as file:
        file.write(txt)
    print(json.dumps({"text": text}), flush=True)

if __name__ == "__main__":
    # print(2)
    generate_txt()
    # print(3)
