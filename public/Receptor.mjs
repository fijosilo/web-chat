class Receptor {
  
  constructor(mimeType, elemMedia) {
    this._mimeType = mimeType;
    this._elemMedia = elemMedia;
    this._blob;
    this._callback;
    // create media source
    this._mediaSource = new MediaSource();
    // connect to media element
    try {
      this._elemMedia.srcObject = this._mediaSource;
    } catch (err) {
      this._elemMedia.src = window.URL.createObjectURL(this._mediaSource);
    }
    this.testStart;
    this._elemMedia.oncanplay = (e) => {
      // TEST delay from first blob arrivel till here
      console.log(Date.now() - this.testStart);
      this._elemMedia.play();
    };
    // on sourceopen create the source buffer
    this._sourceBuffer;
    this._sourceBufferReady = false;
    this._firstBlob = true;
    this._mediaSource.addEventListener('sourceopen', () => {
      // create the source buffer
      this._sourceBuffer = this._mediaSource.addSourceBuffer(this._mimeType);
      // on updateend add another blob
      this._sourceBuffer.addEventListener('updateend', () => {
        if( this._elemMedia.buffered.length && (this._elemMedia.buffered.end(0) - this._elemMedia.buffered.start(0)) > 10 ) {
          this._sourceBuffer.remove(0.0, this._elemMedia.buffered.end(0) - 1.0);
          //console.log('removing');
        } else {
          this._getBlob((blob) => {
            this._sourceBuffer.appendBuffer(blob);
            //console.log('updating');
          });
        }
      });
      this._sourceBufferReady = true;
    });
  }

  //TODO: receive a end of stream
  // stop audio
  // remove full lenght

  _getBlob(callback) {
    if(this._blob) {
      // if there is a buffer deliver it
      callback(this._blob);
      this._blob = null;
    } else {
      // else store the request
      this._callback = callback;
    }
  }

  addBlob(blob) {
    // if source buffer is not ready
    if(!this._sourceBufferReady) {
      return;
    }
    // if it's the first blob
    if(this._firstBlob) {
      this.testStart = Date.now();
      this._sourceBuffer.appendBuffer(blob);
      this._firstBlob = false;
      return;
    }
    // is source buffer waiting for blob
    if(this._callback) {
      // add blob to sorce buffer
      this._callback(blob);
      this._callback = null;
    } else {
      // store blob
      this._blob = blob;
    }
    return;
  }

}

export default Receptor;