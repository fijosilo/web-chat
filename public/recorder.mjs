
class Recorder {

  constructor() {
    this.stream;
    this.recorder;
  }

  recordAudio(bufferSize, callback) {
    // if audio is being recorded
    if(this.recorder) {
      if(this.recorder.mimeType == 'audio/webm;codecs=opus') {
        if(this.recorder.state == 'paused') {
          // resume recording
          this.recorder.resume();
        }
        return;
      }
    }
    // else stop&close stream&recorder and start a new audio stream&recorder
    this.stop();
    // stream options
    let constraints = {audio: true, video: false};
    // get stream
    window.navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        this.stream = stream;
        // create a stream recorder
        this.recorder = new MediaRecorder(this.stream, {mimeType: 'audio/webm;codecs=opus'});
        // when a buffer with bufferSize is recorded
        this.recorder.ondataavailable = function(e) {
          // deliver recording
          callback(e.data);
        };
        // start recording buffers with bufferSize
        media.recorder.start(bufferSize);
      })
      .catch((err) => {
        console.log(err);
      });
    return;
  }

  stopAudio() {
    // if audio is being recorded
    if(this.recorder) {
      if(this.recorder.mimeType == 'audio/webm;codecs=opus') {
        if(this.recorder.state == 'recording') {
          // pause recording
          this.recorder.pause();
        }
      }
    }
  }

  recordVideo(callback) {
    //
  }

  stopVideo() {
    //
  }

  stop() {
    // stop recorder and stream
  }
}

export default Recorder;