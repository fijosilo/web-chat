const socket = io();
import WRTC from './WRTC.mjs';


// TODO: put usernames on their streams
// fix bugs
// on server disconnect need to close all p2p comunications


window.addEventListener('load', () => {
  /********VARIABLES********/
  console.log('WINDOW LOAD');

  let clients;
  let rooms;

  document.getElementById('chatInput').addEventListener('submit', cmdMessage, true);

  let tree = document.getElementById('tree').getElementsByTagName('div')[0];
  let chatOutput = document.getElementById('chatOutput').getElementsByTagName('div')[0];

  /********WEBRTC********/
  let wrtc;

  function wrtcSendSignal(signal) {
    socket.emit('wrtcSignal', signal);
  }
  socket.on('wrtcEventSignal', function(signal) {
    wrtc.receiveSignal(signal);
  });

  function wrtcReceiveMessage(id, channel, message) {
    clientMessage(id, channel, message, () => {
      console.log('Client message');
    });
  }

  /********SOCKETS********/

  socket.on('connection', function() {
    console.log('Connected');
  });

  socket.on('connected', function(data) {
    console.log('Loading wrtc...');
    wrtc = new WRTC(wrtcSendSignal, wrtcReceiveMessage, data.iceservers, data.polite);
    wrtc.createStream();
    Object.keys(data.clients).forEach((key) => {
      if(key != socket.id) {
        wrtc.createConnection(key);
      }
    });
    console.log('Loading rooms...');
    rooms = data.rooms;
    loadRooms(rooms, tree, () => {
      console.log('Loading clients...');
      clients = data.clients;
      loadClients(clients, () => {
        console.log('Loaded');
      });
    });
  });

  socket.on('eventConnect', (data) => {
    // update clients
    clients[data.id] = data.client;
    clients[socket.id].media.monitor[data.id] = true;
    clients[socket.id].media.speaker[data.id] = true;
    wrtc.createConnection(data.id);
    clientConnect(data.id, clients[data.id], () => {
      console.log('Client connected');
    });
  });

  socket.on('eventMove', (data) => {
    // close wrtc room channel
    if(clients[socket.id].room != '') {
      if(clients[data.id].room == clients[socket.id].room) {
        if(data.id != socket.id) {
          // remote client is leaving the room
          wrtc.closeChannel(data.id, clients[socket.id].room);
          wrtc.closeStream(data.id);
          chatToggleStream(data.id, false);
        } else {
          // local client is leaving the room
          Object.keys(clients).forEach((key) => {
            if(key != socket.id) {
              if(clients[key].room == clients[socket.id].room) {
                wrtc.closeStream(key);
                chatToggleStream(key, false);
              }
            }
          });
        }
      }
    }
    // update client room
    clientMove(data.id, data.room, () => {
      // open wrtc channel
      if(clients[socket.id].room != '') {
        if(clients[data.id].room == clients[socket.id].room) {
          if(data.id != socket.id) {
            // remote client is joining the room
            wrtc.createChannel(data.id, data.room);
            wrtc.openStream(data.id);
            if(clients[data.id].media['camera']) {
              chatToggleStream(data.id, true);
            }
          } else {
            // local client is joining the room
            Object.keys(clients).forEach((key) => {
              if(key != socket.id) {
                if(clients[key].room == clients[socket.id].room) {
                  wrtc.openStream(key);
                  if(clients[key].media['camera']) {
                    chatToggleStream(key, true);
                  }
                }
              }
            });
          }
        }
      }
      console.log('Client moved');
    });
  });

  socket.on('eventMedia', (data) => {
    // update clients
    switch(data.type) {
      case 'camera':
        clients[data.activator].media[data.type] = data.state;
        chatToggleStream(data.activator, data.state);
        break;
      case 'microphone':
        clients[data.activator].media[data.type] = data.state;
        break;
      case 'monitor':
        clients[data.activator].media[data.type][data.target] = data.state;
        if(data.activator === socket.id) {
          if(data.target === socket.id) {
            chatToggleStreamAll(data.state);
          } else {
            chatToggleStream(data.target, data.state);
          }
        }
        break;
      case 'speaker':
        clients[data.activator].media[data.type][data.target] = data.state;
        break;
      default:
        break;
    }
    // update DOM
    clientToggleMedia(data);
  });

  socket.on('eventDisconnect', (data) => {
    wrtc.closeConnection(data.id);
    clientDisconnect(data.id, () => {
      // update clients
      delete clients[data.id];
      console.log('Client disconnected');
    });
  });

  socket.on('disconnect', function() {
    disconnected(() => {
      console.log('Disconnected');
    });
  });



  /********COMMANDS********/

  function cmdMove(e) {
    // get the room
    let room = e.target.parentElement.parentElement.id;
    room = room.slice(room.indexOf('-')+1);
    // if client is already in this room ignore
    if(room == clients[socket.id].room) {
      return;
    }
    // send command to server
    socket.emit('cmdMove', {room: room});
  }

  function cmdMessage(e) {
    e.preventDefault();
    let elemInput = document.getElementById('chatInputMessage');
    // get message
    let message = elemInput.value;
    // clear input
    elemInput.value = '';
    // send message
    Object.keys(clients).forEach((key) => {
      if(key != socket.id) {
        if(clients[key].room == clients[socket.id].room) {
          wrtc.sendMessage(key, clients[socket.id].room, message);
        }
      }
    });
    // show sent messages
    clientMessage(socket.id, clients[socket.id].room, message, () => {
      console.log('Client message');
    });
  }

  function cmdToggleCamera(e) {
    let id = this.id.replace(/\w*-\w*-/, '');
    if(id != socket.id) {
      // client can't toggle others camera
      return;
    }
    let state = wrtc.toggleStream('video');
    if(state != undefined) {
      socket.emit('cmdMedia', {target: id, type: 'camera', state: state});
    }
  }

  function cmdToggleMonitor(e) {
    let id = this.id.replace(/\w*-\w*-/, '');
    if(id == socket.id) {
      // toggle all exept already muted
      let state = !clients[socket.id].media.monitor[socket.id];
      Object.keys(clients).forEach((key) => {
        if(key != socket.id) {
          if(clients[socket.id].media.monitor[key]) {
            wrtc.toggleMedia('video', key);
          }
        }
      });
      socket.emit('cmdMedia', {target: id, type: 'monitor', state: state});
    } else {
      // toggle client
      let state = wrtc.toggleMedia('video', id);
      socket.emit('cmdMedia', {target: id, type: 'monitor', state: state});
    }
  }

  function cmdToggleMicrophone(e) {
    let id = this.id.replace(/\w*-\w*-/, '');
    if(id != socket.id) {
      // client can't toggle others microphone
      return;
    }
    let state = wrtc.toggleStream('audio');
    console.log(state);
    if(state != undefined) {
      socket.emit('cmdMedia', {target: id, type: 'microphone', state: state});
    }
  }

  function cmdToggleSpeaker(e) {
    let id = this.id.replace(/\w*-\w*-/, '');
    if(id == socket.id) {
      // toggle all exept already muted
      let state = !clients[socket.id].media.speaker[socket.id];
      Object.keys(clients).forEach((key) => {
        if(key != socket.id) {
          if(clients[socket.id].media.speaker[key]) {
            wrtc.toggleMedia('audio', key);
          }
        }
      });
      socket.emit('cmdMedia', {target: id, type: 'speaker', state: state});
    } else {
      // toggle client
      let state = wrtc.toggleMedia('audio', id);
      socket.emit('cmdMedia', {target: id, type: 'speaker', state: state});
    }
  }



  /********DOM********/

  function loadRooms(arrRooms, elemRoot, done=null, iteration=3) {
    if(iteration < 7) {
      for(const room of arrRooms) {
        // room container element
        let elemRoom = document.createElement('div');
        elemRoom.setAttribute('id', "room-"+room.name);
        // room title element
        let elemRoomTitle;
        // room type
        if(room.access == 'DENY') {
          // division
          elemRoom.setAttribute('class', "division");
          elemRoomTitle = document.createElement("h"+iteration);
          elemRoomTitle.innerText = room.name;
        } else {
          // room
          elemRoom.setAttribute('class', "room");
          elemRoomTitle = document.createElement("button");
          let elemRoomTitleText = document.createElement("h"+iteration);
          elemRoomTitleText.innerText = room.name;
          elemRoomTitle.appendChild(elemRoomTitleText);
          elemRoomTitle.addEventListener('click', cmdMove);
        }
        elemRoom.appendChild(elemRoomTitle);
        // update DOM
        elemRoot.appendChild(elemRoom);
        loadRooms(room.rooms, elemRoom, done, iteration+1);
      }
    }
    if(iteration == 3 && done) {
      done();
    }
    return;
  }

  function loadClients(objClients, done) {
    Object.entries(objClients).forEach(([key, value]) => {
      if(value.room) {
        createClientElem(key, value, (elemClient) => {
          // update DOM
          let elemRoom = document.getElementById('room-'+value.room);
          elemRoom.appendChild(elemClient);
        });
      }
    });
    return done();
  }

  function createClientElem(id, client, done) {
    // client container element
    let elemClient = document.createElement('div');
    elemClient.setAttribute('id', "client-"+id);
    elemClient.setAttribute('class', "client");
    // client avatar element
    let elemClientAvatar = document.createElement('img');
    elemClientAvatar.setAttribute('class', "client-avatar");
    elemClientAvatar.setAttribute('src', "../public/media/client.svg");
    elemClientAvatar.setAttribute('alt', "avatar");
    elemClientAvatar.setAttribute('width', "24");
    elemClientAvatar.setAttribute('height', "24");
    elemClient.appendChild(elemClientAvatar);
    // client username element
    let elemClientUsername = document.createElement('p');
    elemClientUsername.setAttribute('class', "client-username");
    let names = client.username.match(/^(ANON )(.*)/);
    if(names) {
      let elemClientSpan = document.createElement('span');
      elemClientSpan.innerText = names[1];
      elemClientUsername.appendChild(elemClientSpan);
      let elemClientName = document.createElement('p');
      elemClientName.innerText = names[2];
      elemClientUsername.appendChild(elemClientName);
    } else {
      let elemClientName = document.createElement('p');
      elemClientName.innerText = client.username;
      elemClientUsername.appendChild(elemClientName);
    }
    elemClient.appendChild(elemClientUsername);
    // client media elements
    let resource = "";
    // camera
    let elemClientCamera = document.createElement('button');
    elemClientCamera.setAttribute('id', "client-camera-"+id);
    let elemClientCameraImg = document.createElement('img');
    resource = clients[id].media['camera'] ? "../public/media/camera_on.svg" : "../public/media/camera_off.svg";
    elemClientCameraImg.setAttribute('src', resource);
    elemClientCameraImg.setAttribute('alt', "camera");
    elemClientCameraImg.setAttribute('width', "20");
    elemClientCameraImg.setAttribute('height', "20");
    elemClientCamera.appendChild(elemClientCameraImg);
    // monitor
    let elemClientMonitor = document.createElement('button');
    elemClientMonitor.setAttribute('id', "client-monitor-"+id);
    let elemClientMonitorImg = document.createElement('img');
    resource = clients[id].media['monitor'][id] ? "../public/media/monitor_on.svg" : "../public/media/monitor_off.svg";
    elemClientMonitorImg.setAttribute('src', resource);
    elemClientMonitorImg.setAttribute('alt', "camera");
    elemClientMonitorImg.setAttribute('width', "20");
    elemClientMonitorImg.setAttribute('height', "20");
    elemClientMonitor.appendChild(elemClientMonitorImg);
    // video
    let elemClientVideo = document.createElement('div');
    elemClientVideo.setAttribute('id', "client-video-"+id);
    elemClientVideo.setAttribute('class', "client-video");
    let elemClientVideoMedia = document.createElement('video');
    elemClientVideo.appendChild(elemClientVideoMedia);
    // make ANON small and red
    let elemClientVideoUsername = document.createElement('p');
    elemClientVideoUsername.innerText = client.username;
    elemClientVideo.appendChild(elemClientVideoUsername);
    elemClientMonitor.appendChild(elemClientVideo);
    // microphone
    let elemClientMicrophone = document.createElement('button');
    elemClientMicrophone.setAttribute('id', "client-microphone-"+id);
    let elemClientMicrophoneImg = document.createElement('img');
    resource = clients[id].media['microphone'] ? "../public/media/microphone_on.svg" : "../public/media/microphone_off.svg";
    elemClientMicrophoneImg.setAttribute('src', resource);
    elemClientMicrophoneImg.setAttribute('alt', "microphone");
    elemClientMicrophoneImg.setAttribute('width', "20");
    elemClientMicrophoneImg.setAttribute('height', "20");
    elemClientMicrophone.appendChild(elemClientMicrophoneImg);
    // speaker
    let elemClientSpeaker = document.createElement('button');
    elemClientSpeaker.setAttribute('id', "client-speaker-"+id);
    let elemClientSpeakerImg = document.createElement('img');
    resource = clients[id].media['speaker'][id] ? "../public/media/speaker_on.svg" : "../public/media/speaker_off.svg";
    elemClientSpeakerImg.setAttribute('src', resource);
    elemClientSpeakerImg.setAttribute('alt', "microphone");
    elemClientSpeakerImg.setAttribute('width', "20");
    elemClientSpeakerImg.setAttribute('height', "20");
    elemClientSpeaker.appendChild(elemClientSpeakerImg);
    if(id == socket.id) {
      // camera
      elemClientCamera.setAttribute('class', "client-buttons");
      elemClientCamera.addEventListener('click', cmdToggleCamera.bind(elemClientCamera));
      // monitor
      elemClientMonitor.setAttribute('class', "client-buttons");
      elemClientMonitor.addEventListener('click', cmdToggleMonitor.bind(elemClientMonitor));
      // video
      wrtc.setMediaFeedback(id, 'video', elemClientVideoMedia);
      // microphone
      elemClientMicrophone.setAttribute('class', "client-buttons");
      elemClientMicrophone.addEventListener('click', cmdToggleMicrophone.bind(elemClientMicrophone));
      // speaker
      elemClientSpeaker.setAttribute('class', "client-buttons");
      elemClientSpeaker.addEventListener('click', cmdToggleSpeaker.bind(elemClientSpeaker));
    } else {
      // camera
      elemClientCamera.setAttribute('class', "client-icons");
      // monitor
      elemClientMonitor.setAttribute('class', "client-buttons");
      elemClientMonitor.addEventListener('click', cmdToggleMonitor.bind(elemClientMonitor));
      // video
      wrtc.setMediaElement(id, 'video', elemClientVideoMedia);
      // microphone
      elemClientMicrophone.setAttribute('class', "client-icons");
      // speaker
      elemClientSpeaker.setAttribute('class', "client-buttons");
      elemClientSpeaker.addEventListener('click', cmdToggleSpeaker.bind(elemClientSpeaker));
      // audio
      let elemClientAudio = document.createElement('audio');
      elemClientAudio.setAttribute('id', "client-audio-"+id);
      elemClientAudio.setAttribute('class', "client-audio");
      wrtc.setMediaElement(id, 'audio', elemClientAudio);
      elemClientSpeaker.appendChild(elemClientAudio);
    }
    elemClient.appendChild(elemClientCamera);
    elemClient.appendChild(elemClientMonitor);
    elemClient.appendChild(elemClientMicrophone);
    elemClient.appendChild(elemClientSpeaker);
    return done(elemClient);
  }

  function clientConnect(id, client, done) {
    // if client is in a room
    if(client.room) {
      createClientElem(id, clients[id], (elemClient) => {
        // get the room we are moving to
        let elemRoom = document.getElementById('room-'+client.room);
        // move client to the room / update DOM
        elemRoom.appendChild(elemClient);
        return done();
      });
    } else {
      return done();
    }
  }

  function clientMove(id, room, done) {
    // get the room we are moving to
    let elemRoom = document.getElementById('room-'+room);
    // get client element
    let elemClient = document.getElementById('client-'+id);
    // if client was not in a room before
    if(!elemClient) {
      createClientElem(id, clients[id], (elemClient) => {
        // move client to the room
        elemRoom.appendChild(elemClient);
        // update client room
        clients[id].room = room;
        return done();
      });
    } else {
      // move client to the room
      elemRoom.appendChild(elemClient);
      // update client room
      clients[id].room = room;
      return done();
    }
  }

  function clientMessage(id, channel, message, done) {
    // get the time the message was received
    let time = new Date();
    // create the message div element
    let elemMessageDiv = document.createElement("div");
    elemMessageDiv.setAttribute('class', "message-div");
    // create the message username element
    let elemMessageUsername = document.createElement("p");
    elemMessageUsername.setAttribute('class', "message-username");
    elemMessageUsername.innerText = clients[id].username;
    elemMessageDiv.appendChild(elemMessageUsername);
    // create the message time element
    let elemMessageTime = document.createElement("p");
    elemMessageTime.setAttribute('class', "message-time");
    elemMessageTime.innerText = padNumber(time.getHours())+':'+padNumber(time.getMinutes())+':'+padNumber(time.getSeconds());
    elemMessageDiv.appendChild(elemMessageTime);
    // create the message element
    let elemMessage = document.createElement("p");
    elemMessage.setAttribute('class', "message-message");
    elemMessage.innerText = message;
    elemMessageDiv.appendChild(elemMessage);
    // update DOM
    chatOutput.appendChild(elemMessageDiv);
    return done();
  }

  function padNumber(number, digits=2) {
  	if(Number(number) == NaN) {
      return 'NaN';
    }
    const num = Number(number);
    if(num >= 10**(digits-1)) {
      return '' + num;
    } else {
      let str = '';
      for(let i = 0; i < digits-num.toString().length; i++) {
        str += 0;
      }
      str += num;
      return str;
    }
  }

  function clientToggleMedia(data) {
    if(data.activator == socket.id) {
      // reflect toggle state
      clientToggleMediaOnOff(data.target, data.type, data.state);
    } else {
      switch(data.type) {
        case 'camera':
        case 'microphone':
          // reflect toggle state
          clientToggleMediaOnOff(data.activator, data.type, data.state);
          break;
        case 'monitor':
        case 'speaker':
          // reflect toggle state
          clientToggleMediaOnCut(data.activator, data.type, data.state);
          break;
        default:
          break;
      }
    }
  }

  function clientToggleMediaOnOff(id, type, state) {
    // reflect toggle state
    let elemImg = document.getElementById("client-"+type+"-"+id).getElementsByTagName('img')[0];
    if(state) {
      elemImg.src = elemImg.src.replace(/_[a-z]*.svg$/, '_on.svg');
    } else {
      elemImg.src = elemImg.src.replace(/_[a-z]*.svg$/, '_off.svg');
    }
  }

  function clientToggleMediaOnCut(id, type, state) {
    // reflect toggle state
    let elemImg = document.getElementById("client-"+type+"-"+id).getElementsByTagName('img')[0];
    if(elemImg.src.endsWith('_off.svg')) {
      return;
    }
    if(state) {
      elemImg.src = elemImg.src.replace(/_[a-z]*.svg$/, '_on.svg');
    } else {
      elemImg.src = elemImg.src.replace(/_[a-z]*.svg$/, '_cut.svg');
    }
  }

  function chatToggleStreamAll(state) {
    Object.entries(clients).forEach(([key, value]) => {
      if(key != socket.id) {
        if(clients[key].room === clients[socket.id].room) {
          // for every user in the room
          if(state) {
            if(clients[key].media.camera) {
              // if they have the camera on
              if(clients[socket.id].media.monitor[key]) {
                // if we don't have their video muted
                chatToggleStream(key, state);
              }
            }
          } else {
            chatToggleStream(key, state);
          }
        }
      }
    });
  }

  function chatToggleStream(id, state) {
    let elemStream = document.getElementById("client-video-"+id);
    //.parentElement
    if(state && elemStream.parentElement.parentElement.id === 'chatStream') {
      // already enabled
      return;
    }
    if(!state && elemStream.parentElement.parentElement.id != 'chatStream') {
      // already disabled
      return;
    }
    if(state && !clients[socket.id].media.monitor[id]) {
      // monitor is disabled
      return;
    }
    if(state && !clients[id].media.camera) {
      // client camera is disabled
      return;
    }
    // get streams count
    let elemChatStreams = document.getElementById('chatStream').getElementsByTagName('div')[0];
    let count = elemChatStreams.childElementCount;
    count = state ? count+1 : count-1;
    // calculate columns and rows
    let columns, rows;
    let num = Math.sqrt(count);
    if(Number.isInteger(num)) {
      columns = num;
      rows = num;
    } else {
      let int = Math.floor(num);
      let rest = num % 1;
      if(rest < 0.5) {
        columns = int + 1;
        rows = int;
      } else {
        columns = int + 1;
        rows = int + 1;
      }
    }
    columns = columns>0 ? columns : 1;
    rows = rows>0 ? rows : 1;
    // are we adding or removing
    if(state) {
      // change style
      elemChatStreams.style.gridTemplateColumns = "repeat("+columns+", 1fr)";
      elemChatStreams.style.gridTemplateRows = "repeat("+rows+", 1fr)";
      // add stream
      elemChatStreams.appendChild(elemStream);
      elemStream.setAttribute('class', "chat-video");
    } else {
      // remove stream
      let elemClientMonitor = document.getElementById("client-monitor-"+id);
      elemClientMonitor.appendChild(elemStream);
      elemStream.setAttribute('class', "client-video");
      // change style
      elemChatStreams.style.gridTemplateColumns = "repeat("+columns+", 1fr)";
      elemChatStreams.style.gridTemplateRows = "repeat("+rows+", 1fr)";
    }
  }

  function clientDisconnect(id, done) {
    // delete stream
    let elemClientVideo = document.getElementById("client-video-"+id);
    if(elemClientVideo) {
      elemClientVideo.remove();
    }
    // delete client
    let elemClient = document.getElementById("client-"+id);
    if(elemClient) {
      elemClient.remove();
    }
    return done();
  }

  function disconnected(done) {
    // clear sections
    console.log('DISCONNECTED');
    // remove the entire div instead of iterating all childs
    tree.remove();
    // now just create a new div and append it back
    document.getElementById('tree').appendChild(document.createElement("div"));
    // and reasign our variable to this new div
    tree = document.getElementById('tree').getElementsByTagName('div')[0];
    return done();
  }
  
});
