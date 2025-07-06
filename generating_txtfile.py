import pyaudiowpatch as pyaudio
import json
import speech_recognition as sr
from pydub import AudioSegment

def chunking_audio():
    chunks = []
    audio =  AudioSegment.from_wav("output.wav")
    for i in range(0,len(audio), 15000):
        end = len(audio) if i + 15000 > len(audio) else i + 15000
        chunk = audio[i:end]
        chunks.append(chunk)
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
