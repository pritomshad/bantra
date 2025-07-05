import pyaudiowpatch as pyaudio
import wave
import io
import json
import speech_recognition as sr
import queue
import threading
import time 
import os
def generate_txt():
 recognizer = sr.Recognizer()
 with sr.AudioFile("output.wav") as source:
  audio_data = recognizer.record(source)
 text = recognizer.recognize_google(audio_data, language='bn-BD')
 with open("output.txt", "w",encoding="utf-8") as file:
    file.write(text)
 print(json.dumps({"text": text}), flush=True)
if __name__ == "__main__":
    print(2)
    generate_txt()
    print(3)