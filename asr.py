import pyaudiowpatch as pyaudio
import wave
import io
import json
import speech_recognition as sr
import queue
import threading

def get_active_audio_device(p : pyaudio.PyAudio):
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
def record_chunk(p : pyaudio.PyAudio, device_index : int, channels : int, rate : int, q: queue.Queue, stop_event: threading.Event, chunk_duration : int = 3, chunk_size : int = 1024):
    FORMAT = pyaudio.paInt16
    
    stream = p.open(format=FORMAT,
                    channels=channels,
                    rate=rate,
                    input=True,
                    input_device_index=device_index,
                    frames_per_buffer=chunk_size)
    
    while not stop_event.is_set():
        frames = []
        for _ in range(0, int(rate / chunk_size * chunk_duration)):
            try:
                data = stream.read(chunk_size)
                frames.append(data)
            except Exception as e:
                print(json.dumps({"error": f"Recording failed: {e}"}), flush=True)
                continue
            
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wf:
            wf.setnchannels(channels)
            wf.setsampwidth(p.get_sample_size(FORMAT))
            wf.setframerate(rate)
            wf.writeframes(b''.join(frames))
        buffer.seek(0)
        q.put(buffer) # push audio data to queue, this is done for continuous recording

    stream.stop_stream()
    stream.close()

def live_caption():
    recognizer = sr.Recognizer()
    audio_queue = queue.Queue(maxsize=5) # capped queue size saves memory
    stop_event = threading.Event()

    with pyaudio.PyAudio() as p:
        loopback = get_active_audio_device(p)
        if not loopback:
            return
        
        device_index = loopback['index']
        channels = loopback['maxInputChannels']
        rate = int(loopback['defaultSampleRate'])

        # print(f"listening to device: {loopback['name']}", flush=True)
        record_thread = threading.Thread(target=record_chunk, args=(p, device_index, channels, rate, audio_queue, stop_event))
        record_thread.start()

        try:
            while True:
                audio_chunk = audio_queue.get()
                try:
                    with sr.AudioFile(audio_chunk) as source:
                        audio_data = recognizer.record(source)
                    text = recognizer.recognize_google(audio_data, language='bn-BD')
                    print(json.dumps({"text": text}), flush=True)
                    #print(text)
                    
                #    await websocket.send(json.dumps({"transcript": text}))
                except sr.UnknownValueError:
                    print(json.dumps({"text": "[[Unrecognized speech]]"}), flush=True)
                    #print('[][][]')
                    
                #    await websocket.send(json.dumps({"transcript": ""}))
                except sr.RequestError as e:
                    print(json.dumps({"error": f"API request failed: {e}"}), flush=True)
                #    await websocket.send(json.dumps({"error": str(e)}))
                    break
        except KeyboardInterrupt:
            print("Interrupted")
        finally:
            stop_event.set()
            record_thread.join()

if __name__ == "__main__":
    # asyncio.run(main())
    live_caption()