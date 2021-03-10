
class WRTC {
  
  constructor(cbSendSignal, cbOnChannelMessage, iceservers, polite) {
    this._sendSignal = cbSendSignal;
    this._iceservers = iceservers;
    this._polite = polite;
    this._makingOffer = {};
    this._ignoreOffer = {};
    this._connections = {};
    this._channels = {};
    this._onChannelMessage = cbOnChannelMessage;
    this._streams = {};
    this._MediaStream = null;
    this._MediaConstraints = null;
    this._mediaElement = {};
  }

  createConnection(peer) {
    // create connection
    this._connections[peer] = new RTCPeerConnection(this._iceservers);
    // onnegotiationneeded
    this._makingOffer[peer] = false;
    this._connections[peer].onnegotiationneeded = (e) => {
      this._makingOffer[peer] = true;
      // set local description
      this._connections[peer].setLocalDescription()
      .then(() => {
        // send offer
        this._sendSignal({
          sdp: this._connections[peer].localDescription,
          target: peer
        });
        this._makingOffer[peer] = false;
      })
      .catch((err) => {
        console.error(err);
        this._makingOffer[peer] = false;
      });
    };
    // onicecandidate
    this._connections[peer].onicecandidate = (e) => {
      if(e.candidate) {
        // send ice candidate
        this._sendSignal({
          candidate: e.candidate,
          target: peer
        });
      }
    };
    // ondatachannel
    this._channels[peer] = {};
    this._connections[peer].ondatachannel = (e) => {
      // create channel event handlers
      this._channels[peer][e.channel.label] = e.channel;
      e.channel.onopen = (e) => {
        //
      };
      e.channel.onmessage = (e) => {
        this._onChannelMessage(peer, e.target.label, e.data);
      };
      e.channel.onclose = (e) => {
        if(this._channels[peer][e.target.label]) {
          delete this._channels[peer][e.target.label];
        }
      };
    };
    // ontrack
    this._streams[peer] = {};
    this._mediaElement[peer] = {};
    this._connections[peer].ontrack = (e) => {
      // create stream from track
      this._streams[peer][e.track.kind] = new MediaStream([e.track]);
      // create media event handlers
      this._mediaElement[peer][e.track.kind].onloadeddata = function(e) {e.target.play();};
      // connect media to stream
      this._mediaElement[peer][e.track.kind].srcObject = this._streams[peer][e.track.kind];
    };
    return;
  }

  receiveSignal(signal) {
    if(signal.sdp) {
      // is it an offer and does it collide with existing offer
      const offerCollision = (signal.sdp.type == "offer") && 
        (this._makingOffer[signal.activator] || this._connections[signal.activator].signalingState != "stable");
      // if it collides and we are impolite ignore offer
      this._ignoreOffer[signal.activator] = !this._polite[signal.activator] && offerCollision;
      if(this._ignoreOffer[signal.activator]) {
        return;
      }
      // set remote description
      this._connections[signal.activator].setRemoteDescription(signal.sdp)
      .then(() => {
        if(signal.sdp.type == "offer") {
          // set local description
          this._connections[signal.activator].setLocalDescription()
          .then(() => {
            // send answer
            this._sendSignal({
              sdp: this._connections[signal.activator].localDescription,
              target: signal.activator
            });
          })
          .catch((err) => {
            console.error(err);
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
    } else if(signal.candidate) {
      // add ice candidate
      this._connections[signal.activator].addIceCandidate(signal.candidate)
      .then(() => {})
      .catch((err) => {
        if(!this._ignoreOffer[signal.activator]) {
          console.error(err);
        }
      });
    }
  }

  closeConnection(peer) {
    try {
      // close streams
      for(let sender of this._connections[peer].getSenders()) {
        this._connections[peer].removeTrack(sender);
      }
      // close channels
      Object.values(this._channels[peer]).forEach((channel) => {
        channel.close();
      });
      // close connection
      this._connections[peer].close();
    } catch (err) {
      console.error(err);
    } finally {
      // reinitialize variables
      delete this._streams[peer];
      delete this._mediaElement[peer];
      this._channels = {};
      delete this._connections[peer];
    }
  }

  createChannel(peer, channel) {
    // is channel already created
    if(this._channels[peer][channel]) {
      return;
    }
    // create channel
    this._channels[peer][channel] = this._connections[peer].createDataChannel(channel);
    this._channels[peer][channel].onopen = (e) => {
      //
    };
    this._channels[peer][channel].onmessage = (e) => {
      this._onChannelMessage(peer, e.target.label, e.data);
    };
    this._channels[peer][channel].onclose = (e) => {
      console.log('webrtc channel close');
      // delete the channel
      if(this._channels[peer] && this._channels[peer][e.target.label]) {
        delete this._channels[peer][e.target.label];
      }
    };
  }

  closeChannel(peer, channel) {
    // close channel
    this._channels[peer][channel].close();
  }

  sendMessage(peer, channel, message) {
    // send message
    this._channels[peer][channel].send(message);
  }

  createStream() {
    // get media stream
    this._MediaConstraints = {audio: true, video: {facingMode: "user"}};
    window.navigator.mediaDevices.getUserMedia(this._MediaConstraints)
    .then((stream) => {
      this._MediaStream = stream;
      for(let track of this._MediaStream.getTracks()) {
        track.enabled = false;
      }
    })
    .catch((err) => {
      this._MediaConstraints = {audio: true, video: false};
      window.navigator.mediaDevices.getUserMedia(this._MediaConstraints)
      .then((stream) => {
        this._MediaStream = stream;
        for(let track of this._MediaStream.getTracks()) {
          track.enabled = false;
        }
      })
      .catch((err) => {
        this._MediaConstraints = {audio: false, video: false};
      });
    });
  }

  toggleStream(type) {
    // mute/unmute stream audio/video
    let state;
    for(let track of this._MediaStream.getTracks()) {
      if(track.kind == type) {
        track.enabled = !track.enabled;
        state = track.enabled;
      }
    }
    return state;
  }

  openStream(peer, type) {
    // add tracks to connection
    for(let track of this._MediaStream.getTracks()) {
      if(track.kind === type) {
        try {
          this._connections[peer].addTrack(track);
        } catch(err) {
          // track already added or connection closed
        }
      }
    }
  }

  closeStream(peer, type) {
    // remove tracks from connection
    for(let sender of this._connections[peer].getSenders()) {
      if(sender.track && sender.track.kind === type) {
        this._connections[peer].removeTrack(sender);
      }
    }
  }

  setMediaElement(peer, type, elem) {
    // set media element
    this._mediaElement[peer][type] = elem;
  }

  setMediaFeedback(peer, type, elem) {
    if(!this._MediaStream) {
      return;
    }
    let tracks;
    if(type = 'video') {
      tracks = this._MediaStream.getVideoTracks();
    } else if(type = 'audio') {
      tracks = this._MediaStream.getAudioTracks();
    } else {
      tracks = this._MediaStream.getTracks();
    }
    if(!tracks) {
      return;
    }
    // set media element
    this._mediaElement[peer] = {};
    this._mediaElement[peer][type] = elem;
    // create stream from track
    this._streams[peer] = {};
    this._streams[peer][type] = new MediaStream(tracks);
    // create media event handlers
    this._mediaElement[peer][type].onloadeddata = function(e) {e.target.play();};
    // connect media to stream
    this._mediaElement[peer][type].srcObject = this._streams[peer][type];
  }

  toggleMedia(type, peer) {
    this._mediaElement[peer][type].muted = !this._mediaElement[peer][type].muted;
    return !this._mediaElement[peer][type].muted;
  }

}

export default WRTC;