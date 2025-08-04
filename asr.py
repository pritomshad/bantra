import pyaudiowpatch as pyaudio
import wave
import io
import json
import speech_recognition as sr
import queue
import threading
import time
import sys
from datetime import datetime

# OUTPUT_FILE = "output.wav"
MERGED_AUDIO = io.BytesIO()

"""

"""
def trascribing_for_txt_file():
    MERGED_AUDIO.seek(0)
    with wave.open(MERGED_AUDIO, 'rb') as wf:
        duration = wf.getnframes() / wf.getframerate()
        print(f"Merged audio duration: {duration:.2f} seconds")
    try:
        print(4)
        # audio_chunks.append(audio_chunk)
        recognizer = sr.Recognizer()
        print(5)
        MERGED_AUDIO.seek(0)
        with sr.AudioFile(MERGED_AUDIO) as source:
            audio_data = recognizer.record(source)
        text = recognizer.recognize_google(audio_data, language='bn-BD')
        print(text)
        

                    # save to file
        with open(filename, "a", encoding="utf-8") as f:
            f.write(text + "\n")
            f.flush()
                    
    except sr.UnknownValueError:
        print(json.dumps({"text": "Unrecognized speech"}), flush=True)
    except sr.RequestError as e:
        print(json.dumps({"error": f"API request failed: {e}"}), flush=True)
    return    

txt_thread = threading.Thread(target=trascribing_for_txt_file)

def mergeing_chunks(audio_chunks: list[io.BytesIO]):
    print(1234)
    with wave.open(MERGED_AUDIO,'wb') as merged:
        print(12345)
        bytes_to_object = audio_chunks[0]
        bytes_to_object.seek(0)
        print(123456)
        with wave.open(bytes_to_object, 'rb') as h:
            print(1234567)
            merged.setparams(h.getparams())
        for x in audio_chunks:
            
            x.seek(0)
            with wave.open(x,'rb') as chunks:
                fr = chunks.readframes(chunks.getnframes())
                merged.writeframes(fr)

    return
            
            


def get_active_audio_device(p: pyaudio.PyAudio):
    try:
        wasapi_info = p.get_host_api_info_by_type(pyaudio.paWASAPI)
    except OSError:
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

"""
This works. But, caption generation with chunck_duration is pretty annoying, it breakes word mid sentence.
we should do something like whisper for local trancription. But recognize_google() is more
accurate at bangla. So the plan here is to record the whole meeting in an audio file and
use recognize_google() for full transcript from that recorded file, and for live caption we can use whisper.
try to implement whisper for live caption... OVER
"""

def record_chunk(p: pyaudio.PyAudio, device_index: int, channels: int, rate: int, q: queue.Queue, stop_event: threading.Event, chunk_duration: int = 3, chunk_size: int = 1024):
    FORMAT = pyaudio.paInt16
    data_queue = queue.Queue()
    stream = p.open(format=FORMAT,
                    channels=channels,
                    rate=rate,
                    input=True,
                    input_device_index=device_index,
                    frames_per_buffer=chunk_size)

    def read_tmd():
        try:
            data = stream.read(chunk_size, exception_on_overflow=False)
            data_queue.put(data)
        except Exception as e:
            data_queue.put(e)

    while not stop_event.is_set():
        frames = []

        for _ in range(0, int(rate / chunk_size * chunk_duration)):

            thd = threading.Thread(target=read_tmd)
            thd.start()
            thd.join(3)
            if not data_queue.empty():
                result = data_queue.get()
                if isinstance(result, Exception):
                    print(json.dumps({"error": f"Recording failed: {result}"}), flush=True)
                    continue
                else:
                    frames.append(result)
            else:
                stop_event.set()
                break

        buffer = io.BytesIO()

        with wave.open(buffer, 'wb') as wf:
            wf.setnchannels(channels)
            wf.setsampwidth(p.get_sample_size(FORMAT))
            wf.setframerate(rate)
            wf.writeframes(b''.join(frames))
        buffer.seek(0)
        q.put(buffer)

    stream.stop_stream()
    stream.close()

def live_caption(filename: str):
    recognizer = sr.Recognizer()
    audio_queue = queue.Queue(maxsize=10)
    stop_event = threading.Event()
    with pyaudio.PyAudio() as p:
        try:
            p = pyaudio.PyAudio()
            print(json.dumps({"debug":"PyAudio initialized"}), flush=True)
        except Exception as e:
            print(json.dumps({"debug":f"Failed to initialize PyAudio: {e}"}), flush=True)
            return

        loopback = get_active_audio_device(p)
        if not loopback:
            print("Failed to get loopback device, retrying in 2 seconds...", flush=True)
            return

        device_index = loopback['index']
        channels = loopback['maxInputChannels']
        rate = int(loopback['defaultSampleRate'])

        print(f"listening to device: {loopback['name']}", flush=True)
        record_thread = threading.Thread(target=record_chunk, args=(p, device_index, channels, rate, audio_queue, stop_event))
        record_thread.start()

        try:
            audio_chunks = []
            txt_thread_flag = False
            while not (audio_queue.empty() and stop_event.is_set()):
                
                audio_chunk = None
                try:
                    audio_chunk = audio_queue.get(timeout=20)
                except queue.Empty:
                    print(json.dumps({"error": "Audio queue timeout"}), flush=True)
                    continue

                try:
                    audio_chunks.append(audio_chunk)
                    with sr.AudioFile(audio_chunk) as source:
                        audio_data = recognizer.record(source)
                    text = recognizer.recognize_google(audio_data, language='bn-BD')
                    print(json.dumps({"text": text}), flush=True)


                    # save to file
                    # with open(filename, "a", encoding="utf-8") as f:
                    #     f.write(text + "\n")
                    #     f.flush()


                    
                except sr.UnknownValueError:
                    print(json.dumps({"text": "Unrecognized speech"}), flush=True)
                except sr.RequestError as e:
                    print(json.dumps({"error": f"API request failed: {e}"}), flush=True)
                    break
                print(len(audio_chunks))
                if(len(audio_chunks) == 5 or (stop_event.is_set() and audio_queue.empty())):
                    print(22)
                    # print(type(audio_chunk))
                    # audio_chunks[i].seek(0)
                    # alu_porota = audio_chunks[0]
                    MERGED_AUDIO.seek(0)
                    MERGED_AUDIO.truncate(0)
                    # for i in range(0,5):
                    #     print(audio_chunks[i])
                    #     bytes_to_object = audio_chunks[i]
                    #     bytes_to_object.seek(0)
                    #     content = bytes_to_object.read()
                    #     MERGED_AUDIO.write(content)
                    mergeing_chunks(audio_chunks)    
                    audio_chunks.clear()
                    print(3)
                    # if(txt_thread_flag == True):
                    #     print(333)
                    #     txt_thread.join(1)
                        
                    print(444) 
                    txt_thread = threading.Thread(target=trascribing_for_txt_file)   
                    txt_thread.start() 
                    print(555)
                    txt_thread_flag = True
                    #to handle when audio stops recording
                    if(stop_event.is_set() and audio_queue.empty()):
                        txt_thread.join(3)
                # audio_chunk.seek(0)
                # with wave.open(audio_chunk, 'rb') as wf:
                #     new_frames = wf.readframes(wf.getnframes())
                # if os.path.exists(OUTPUT_FILE):
                #     with wave.open(OUTPUT_FILE, 'rb') as wf:
                #         old_params = wf.getparams()
                #         old_frames = wf.readframes(wf.getnframes())
                #     if old_params[:3] != (channels, 2, rate):
                #         raise ValueError("Existing file format mismatch.")
                #     all_frames = old_frames + new_frames
                # else:
                #     all_frames = new_frames

                # with wave.open(OUTPUT_FILE, 'wb') as wf:
                #     wf.setnchannels(channels)
                #     wf.setsampwidth(2)
                #     wf.setframerate(rate)
                #     wf.writeframes(all_frames)
            
        except KeyboardInterrupt:
            print("Interrupted")
        finally:
            print("Exited record_chunk()")
            stop_event.set()
            record_thread.join()
            del p
            time.sleep(1)
            return

if __name__ == "__main__":

    filename = sys.argv[1]


    live_caption(filename)
