
class WRTC {
  
  constructor(cbSendSignal, cbReceiveMessage, options={iceServers: [{urls: "stun:stun.1.google.com:19302"}]}) {
    this._sendSignal = cbSendSignal;
    this._receiveMessage = cbReceiveMessage;
    this._options = options;
    this._connections = {};
    this._channels = {};
  }

  signal(data) {
    switch(data.type) {
      case 'candidate':
        this._icecandidateFromPeer(data.activator, data.candidate);
        break;
      case 'offer':
        this._offerFromPeer(data.activator, data.sdp);
        break;
      case 'answer':
        this._answerFromPeer(data.activator, data.sdp);
        break;
      default:
        break;
    }
  }

  sendMessage(peer, channel, message) {
    let ch = this._getChannel(peer, channel);
    if(ch) {
      // send message
      ch.send(message);
    } else {
      // open channel
      this.openChannel(peer, channel);
    }
  }

  openChannel(peer, channel) {
    if(!this._connections[peer]) {
      // create connection
      this._createConnection(peer, () => {
        // create channel
        this._createChannel(peer, channel, () => {
          // start negotiations
          this._offerToPeer(peer);
        });
      });
    } else {
      let ch = this._getChannel(peer, channel);
      if(!ch) {
        // create channel
        this._createChannel(peer, channel);
      }
    }
  }

  _createChannel(peer, channel, done=null) {
    // create channel
    let ch = this._connections[peer].createDataChannel(channel);
    this._channels[peer].push(ch);
    // create channel event handlers
    ch.onopen = () => {
      console.log('webrtc channel open');
    };
    ch.onmessage = (e) => {
      this._receiveMessage(peer, e.target.label, e.data);
    };
    ch.onclose = () => {
      console.log('webrtc channel close');
    };
    // done
    if(done) {return done();} else {return;}
  }

  _getChannel(peer, channel) {
    if(this._channels[peer]) {
      let channels = this._channels[peer].filter(value => value.label == channel);
      if(channels.length > 0) {
        return channels[0];
      }
    }
    return null;
  }

  _createConnection(peer, done) {
    // create connection
    this._connections[peer] = new RTCPeerConnection(this._options);
    // create connection event handlers
    this._connections[peer].onicecandidate = (e) => {
      if(e.candidate) {
        // send ice candidate through the signaling server
        this._sendSignal({
          candidate: e.candidate,
          type: 'candidate',
          target: peer
        });
      }
    };
    this._channels[peer] = [];
    this._connections[peer].ondatachannel = (e) => {
      // create channel event handlers
      this._channels[peer].push(e.channel);
      e.channel.onopen = () => {
        console.log('webrtc channel open');
      };
      e.channel.onmessage = (e) => {
        this._receiveMessage(peer, e.target.label, e.data);
      };
      e.channel.onclose = () => {
        console.log('webrtc channel close');
      };
    };
    // done
    return done();
  }

  _offerToPeer(peer) {
    // create offer
    this._connections[peer].createOffer()
    .then((offer) => {
      // set local description
      this._connections[peer].setLocalDescription(offer)
      .then(() => {
        // send offer through the signaling server
        this._sendSignal({
          sdp: offer,
          type: 'offer',
          target: peer
        });
      })
      .catch((err) => {
        console.error(err);
      });
    })
    .catch((err) => {
      console.error(err);
    });
  }

  _offerFromPeer(peer, offer) {
    // if connection not created
    if(!this._connections[peer]) {
      // create connection
      this._createConnection(peer, () => {
        // set remote description
        this._connections[peer].setRemoteDescription(offer)
        .then(() => {
          //
        })
        .catch((err) => {
          console.error(err);
        });
        // create answer
        this._answerToPeer(peer);
      });
    } else {
      // set remote description
      this._connections[peer].setRemoteDescription(offer)
      .then(() => {
        //
      })
      .catch((err) => {
        console.error(err);
      });
      // create answer
      this._answerToPeer(peer);
    }
  }

  _answerToPeer(peer) {
    // create answer
    this._connections[peer].createAnswer()
    .then((answer) => {
      // set local description
      this._connections[peer].setLocalDescription(answer)
      .then(() => {
        // send answer through the signaling server
        this._sendSignal({
          sdp: answer,
          type: 'answer',
          target: peer
        });
      })
      .catch((err) => {
        console.error(err);
      });
    })
    .catch((err) => {
      console.error(err);
    });
  }

  _answerFromPeer(peer, answer) {
    // set remote description
    this._connections[peer].setRemoteDescription(answer)
    .then(() => {
      //
    })
    .catch((err) => {
      console.error(err);
    });
  }

  _icecandidateFromPeer(peer, candidate) {
    // add ice candidate
    console.log(candidate);
    this._connections[peer].addIceCandidate(new RTCIceCandidate(candidate));
  }

  _destroyConnection(peer) {
    // close tracks?
    // close channels
    for(let channel of this._channels[peer]) {
      channel.close();
      channel = undefined;
    }
    this._channels[peer] = undefined;
    // close connection
    this._connections[peer].close();
    this._connections[peer] = undefined;
  }

}

export default WRTC;