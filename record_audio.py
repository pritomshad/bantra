import pyaudiowpatch as pyaudio
import wave
import io
import json
import speech_recognition as sr
import queue
import threading
import errno
import asyncio
import time 
import os
import sys
OUTPUT_FILE = "output.wav"
def get_active_audio_device(p : pyaudio.PyAudio):
    try:
        wasapi_info = p.get_host_api_info_by_type(pyaudio.paWASAPI)
    except OSError :
        print(json.dumps({"error": "WASAPI not available."}))
        return None
    default_speakers = p.get_device_info_by_index(wasapi_info["defaultOutputDevice"])
    if not default_speakers["isLoopbackDevice"]:
        for loopback in p.get_loopback_device_info_generator():
            if default_speakers["name"] in loopback["name"]:
                return loopback
        print(json.dumps({"error": "No loopback device found."}))
        return None
    return default_speakers


def record_audio(p : pyaudio.PyAudio, device_index : int, channels : int, rate : int, q : queue.Queue, chunk_duration : int = 3, chunk_size : int = 1024):
  FORMAT = pyaudio.paInt16
  data_queue = queue.Queue()
  try:
     stream = p.open(format=FORMAT,
                    channels=channels,
                    rate=rate,
                    input=True,
                    input_device_index=device_index,
                    frames_per_buffer=chunk_size)
  except Exception as e:
    print(json.dumps({"error": f"Failed to open stream: {e}"}), flush=True)
    return

  def read_tmd(): 
             try :
              data = stream.read(chunk_size, exception_on_overflow=False)
              data_queue.put(data)
             except Exception as e:
              data_queue.put(e)


  while True:
    frames = []        
    for _ in range(0, int(rate / chunk_size * chunk_duration)):
    
     thd = threading.Thread(target=read_tmd)
     thd.start()
     thd.join(3)
     if not data_queue.empty():
      result = data_queue.get()
      if isinstance(result, Exception):
        # print(json.dumps({"error": f"Recording failed: {result}"}), flush=True)
        continue
      else:
        frames.append(result)
     else:
      os.execv(sys.executable, ['python'] + sys.argv)
   
    buffer = io.BytesIO()
    
    try:
     with wave.open(buffer, 'wb') as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(p.get_sample_size(FORMAT))
        wf.setframerate(rate)
        wf.writeframes(b''.join(frames))
    except Exception as e:
     print(json.dumps({"error": f"Failed to write to in-memory WAV buffer: {e}"}), flush=True)
     return
    
    buffer.seek(0)
    q.put(buffer) # push audio data to queue, this is done for continuous recording
  




def wave_file(): 

    audio_queue = queue.Queue(maxsize=10)

    try:
            p = pyaudio.PyAudio()
            print("PyAudio initialized", flush=True)
    except Exception as e:
            print(f"Failed to initialize PyAudio: {e}", flush=True)
            time.sleep(1)
            return
    loopback = get_active_audio_device(p)
    if not loopback:
            print("Failed to get loopback device, retrying in 2 seconds...", flush=True)
            time.sleep(1)
            return
    else :
         print(f"listening to device: {loopback['name']}", flush=True)
         device_index = loopback['index']
         channels = loopback['maxInputChannels']
         rate = int(loopback['defaultSampleRate'])
         record_thread = threading.Thread(target=record_audio, args=(p,device_index,channels,rate,audio_queue))
         record_thread.start()


    while True:
     try:
      frame_chunk = audio_queue.get(timeout=20)
     except queue.Empty:
      print(json.dumps({"error": "Audio queue timeout"}), flush=True)
      return
     frame_chunk.seek(0)
     with wave.open(frame_chunk, 'rb') as wf:
      new_frames = wf.readframes(wf.getnframes())
     if os.path.exists(OUTPUT_FILE):
         with wave.open(OUTPUT_FILE, 'rb') as wf:
             old_params = wf.getparams()
             old_frames = wf.readframes(wf.getnframes())
         if old_params[:3] != (channels, 2, rate):
             raise ValueError("Existing file format mismatch.")
         all_frames = old_frames + new_frames
     else:
         all_frames = new_frames

     with wave.open(OUTPUT_FILE, 'wb') as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(all_frames) 


if __name__ == "__main__":
 while True:
       print(json.dumps({"message": "called main"}), flush=True)
       wave_file()
       time.sleep(1)

