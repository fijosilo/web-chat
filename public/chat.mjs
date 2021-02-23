const socket = io();
import WRTC from './WRTC.mjs';
import BBCode from './BBCode.mjs';



let bbcode = new BBCode();
let clients;
let rooms;
let wrtc;
let layout;

window.addEventListener('DOMContentLoaded', (event) => {
  if(window.devicePixelRatio > 1.5 || window.innerWidth < 768) {
    // small screen
    layout = 'small';
    document.getElementById('tab-tree').checked = true;
  } else if( window.innerWidth >= 768 && window.innerWidth < 1280 ) {
    // medium screen
    layout = 'medium';
    document.getElementById('tab-chat').checked = true;
  } else if( window.innerWidth >= 1280 ) {
    // big screen
    layout = 'big';
    document.getElementById('tab-tree').checked = true;
  }
  windowResize();
  document.getElementById('chat-input').addEventListener('submit', cmdMessage, true);
  document.getElementById('chat-input-message').addEventListener('keydown', cmdMessage, true);
  window.addEventListener('resize', windowResize);

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
    loadRooms(() => {
      console.log('Loading clients...');
      clients = data.clients;
      loadClients(() => {
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
            // show room description
            roomDescription(data.room);
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

  /********WEBRTC********/

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
    // handle textarea inputs
    if(e.type === 'keydown') {
      switch (e.key) {
        case 'Enter':
          if(e.ctrlKey === true) {
            // add a newline
            let elemInput = document.getElementById('chat-input-message');
            elemInput.value += '\n';
            elemInput.scrollTop = elemInput.scrollHeight;
            return;
          }
          break;
        default:
          return;
      }
    }
    e.preventDefault();
    // validate message
    let elemInput = document.getElementById('chat-input-message');
    if(elemInput.value.length < 1) {
      return;
    }
    // validate user room
    if(!clients[socket.id].room) {
      return;
    }
    // send message
    Object.keys(clients).forEach((key) => {
      if(key != socket.id) {
        if(clients[key].room == clients[socket.id].room) {
          wrtc.sendMessage(key, clients[socket.id].room, elemInput.value);
        }
      }
    });
    // show sent messages
    clientMessage(socket.id, clients[socket.id].room, elemInput.value, () => {
      console.log('Client message');
    });
    // clear input
    elemInput.value = '';
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

  function loadRooms(done=null) {
    let tree = document.createElement("div");
    tree.setAttribute('id', "room-1");
    document.getElementById('tree').appendChild(tree);
    for(const room of rooms) {
      // room container
      let elemRoom = document.createElement('div');
      elemRoom.setAttribute('id', "room-"+room.id);
      // room iteration
      let it = 3;
      let root = room.parent_id;
      while(root != 1) {
        let r = rooms.find((value) => {
          return value.id === root;
        });
        root = r.parent_id;
        it++;
      }
      if(it > 6) {
        console.error('Room iteration '+it+' is invalid.');
        continue;
      }
      // room title
      let elemRoomTitle;
      if(room.division) {
        elemRoom.setAttribute('class', "division");
        elemRoomTitle = document.createElement("h"+it);
        elemRoomTitle.innerText = room.name;
      } else {
        elemRoom.setAttribute('class', "room");
        elemRoomTitle = document.createElement("button");
        let elemRoomTitleText = document.createElement("h"+it);
        elemRoomTitleText.innerText = room.name;
        elemRoomTitle.appendChild(elemRoomTitleText);
        elemRoomTitle.addEventListener('click', cmdMove);
      }
      elemRoom.appendChild(elemRoomTitle);
      // update DOM
      if(room.sibling_id != 0) {
        // append after sibling
        let elemParent = document.getElementById("room-"+room.parent_id);
        let elemSibling = document.getElementById("room-"+room.sibling_id);
        elemParent.insertBefore(elemRoom, elemSibling.nextSibling);
      } else {
        // append in alphabetic order(data is already in order just need to append)
        let elemParent = document.getElementById("room-"+room.parent_id);
        elemParent.appendChild(elemRoom);
      }
    }
    return done ? done() : done;
  }

  function loadClients(done=null) {
    Object.entries(clients).forEach(([id, client]) => {
      if(client.room) {
        createClientElem(id, client, (elemClient) => {
          // update DOM
          let elemRoom = document.getElementById('room-'+client.room);
          elemRoom.appendChild(elemClient);
        });
      }
    });
    return done ? done() : done;
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
    // video media
    let elemClientMedia = document.createElement('div');
    elemClientMedia.setAttribute('id', "media-"+id);
    elemClientMedia.setAttribute('class', "media");
    document.getElementById('stream-backend').appendChild(elemClientMedia);
    let elemClientMediaVideo = document.createElement('video');
    elemClientMediaVideo.setAttribute('id', "media-video-"+id);
    elemClientMedia.appendChild(elemClientMediaVideo);
    // video media username
    let elemClientMediaUsername = document.createElement('p');
    elemClientMediaUsername.innerText = client.username;
    elemClientMedia.appendChild(elemClientMediaUsername);
    // audio media
    let elemClientMediaAudio = document.createElement('audio');
    elemClientMediaAudio.setAttribute('id', "media-audio-"+id);
    elemClientMedia.appendChild(elemClientMediaAudio);
    if(id == socket.id) {
      // camera
      elemClientCamera.setAttribute('class', "client-buttons");
      elemClientCamera.addEventListener('click', cmdToggleCamera.bind(elemClientCamera));
      // monitor
      elemClientMonitor.setAttribute('class', "client-buttons");
      elemClientMonitor.addEventListener('click', cmdToggleMonitor.bind(elemClientMonitor));
      // video
      wrtc.setMediaFeedback(id, 'video', elemClientMediaVideo);
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
      wrtc.setMediaElement(id, 'video', elemClientMediaVideo);
      // microphone
      elemClientMicrophone.setAttribute('class', "client-icons");
      // speaker
      elemClientSpeaker.setAttribute('class', "client-buttons");
      elemClientSpeaker.addEventListener('click', cmdToggleSpeaker.bind(elemClientSpeaker));
      // audio
      wrtc.setMediaElement(id, 'audio', elemClientMediaAudio);
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
    bbcode.parsedToHTML(bbcode.parse(message), elemMessage);
    elemMessageDiv.appendChild(elemMessage);
    // update DOM
    let elemChatOutput = document.getElementById("chat-output");
    elemChatOutput.insertBefore(elemMessageDiv, elemChatOutput.childNodes[0]);
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
    if(clients[id].room !== clients[socket.id].room) {
      // don't show streams from other rooms
      return;
    }
    let elmMedia = document.getElementById("media-"+id);
    if(state && elmMedia.parentElement.id != 'stream-backend') {
      // already enabled
      return;
    }
    if(!state && elmMedia.parentElement.id != 'stream-frontend') {
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
    let elmStreamFrontend = document.getElementById('stream-frontend');
    let streamsCount = elmStreamFrontend.childElementCount;
    streamsCount = state ? streamsCount+1 : streamsCount-1;
    // toggle stream on big layout
    let elmStream = document.getElementById('stream');
    if(layout === 'big') {
      if(elmStream.style.display !== 'block') {
        document.getElementById('chat').style.top = '70vh';
        elmStream.style.display = 'block';
      }
    }
    // get available space
    let arrBoundingRect = [];
    arrBoundingRect.push(document.getElementById('stream').getBoundingClientRect());
    arrBoundingRect.push(document.getElementById('chat').getBoundingClientRect());
    arrBoundingRect.push(document.getElementById('info').getBoundingClientRect());
    arrBoundingRect.push(document.getElementById('tree').getBoundingClientRect());
    let boundingRect = arrBoundingRect.find((value) => {return value.width > 0;});
    let elmAspectRatio = Number(boundingRect.width) / Number(boundingRect.height);
    // calculate columns and rows
    let columns, rows;
    if(elmAspectRatio >= 1) {
      rows = Math.sqrt(streamsCount / elmAspectRatio);
      rows = Math.floor(rows);
      rows = rows>0 ? rows : 1;
      columns = streamsCount / rows;
      columns = Math.ceil(columns);
    } else {
      elmAspectRatio = 1 / elmAspectRatio;
      columns = Math.sqrt(streamsCount / elmAspectRatio);
      columns = Math.floor(columns);
      columns = columns>0 ? columns : 1;
      rows = streamsCount / columns;
      rows = Math.ceil(rows);
    }
    let columnSize = Math.floor(boundingRect.width / columns);
    columnSize = columnSize<256 ? 256 : columnSize;
    let rowSize = Math.floor(boundingRect.height / rows);
    rowSize = rowSize<144 ? 144 : rowSize;
    // are we adding or removing
    if(state) {
      // change style
      elmStreamFrontend.style.gridTemplateColumns = "repeat("+columns+", "+columnSize+"px)";
      elmStreamFrontend.style.gridTemplateRows = "repeat("+rows+", "+rowSize+"px)";
      // add stream
      if(socket.id === id) {
        elmStreamFrontend.insertBefore(elmMedia, elmStreamFrontend.childNodes[0]);
      } else {
        elmStreamFrontend.appendChild(elmMedia);
      }
    } else {
      // remove stream
      document.getElementById("stream-backend").appendChild(elmMedia);
      // change style
      elmStreamFrontend.style.gridTemplateColumns = "repeat("+columns+", "+columnSize+"px)";
      elmStreamFrontend.style.gridTemplateRows = "repeat("+rows+", "+rowSize+"px)";
    }
    // toggle stream on big layout
    if(layout === 'big' && streamsCount < 1) {
      if(elmStream.style.display !== 'none') {
        elmStream.style.display = 'none';
        document.getElementById('chat').style.top = '0';
      }
    }
  }

  function windowResize() {
    // SCALE
    let scaleHTML;
    let scaleMenu;
    if(window.devicePixelRatio < 1.5) {
      // normal display
      scaleHTML = (window.innerWidth * 16 / 1920);
      scaleHTML = (scaleHTML < 16) ? 16 : scaleHTML;
      scaleHTML = scaleHTML * window.devicePixelRatio;
      scaleHTML = Math.round(scaleHTML);
      scaleMenu = window.innerWidth>768 ? scaleHTML*0.75 : scaleHTML*1.25;
      scaleMenu = Math.round(scaleMenu);
    } else {
      // retina display
      scaleHTML = Math.round( (window.screen.width * 16 / 1080) * Math.pow(window.devicePixelRatio, 3) );
      scaleHTML = (scaleHTML < 16) ? 16 : scaleHTML;
      scaleMenu = scaleHTML;
    }
    let elmHTML = document.getElementsByTagName('html')[0];
    elmHTML.style.fontSize = scaleHTML+'px';
    elmHTML.style.setProperty('--scaleMenu', scaleMenu+'px');
    // LAYOUT
    if( layout !== 'small' && window.devicePixelRatio > 1.5 || window.innerWidth < 768) {
      // small screen
      layout = 'small';
    } else if( layout !== 'medium' &&  window.innerWidth >= 768 && window.innerWidth < 1280 ) {
      // medium screen
      if(document.getElementById('tab-tree').checked) {
        document.getElementById('tab-chat').checked = true;
      }
      if(!document.getElementById('tab-stream').checked) {
        document.getElementById('stream').style.display = null;
        document.getElementById('chat').style.top = null;
      }
      layout = 'medium';
    } else if( layout !== 'big' && window.innerWidth >= 1280 ) {
      // big screen
      if(document.getElementById('stream-frontend').childElementCount > 0) {
        document.getElementById('chat').style.top = '70vh';
        document.getElementById('stream').style.display = 'block';
      }
      layout = 'big';
    }
    // RESIZE STREAM
    // get streams count
    let elmStreamFrontend = document.getElementById('stream-frontend');
    let streamsCount = elmStreamFrontend.childElementCount;
    // get available space
    let arrBoundingRect = [];
    arrBoundingRect.push(document.getElementById('stream').getBoundingClientRect());
    arrBoundingRect.push(document.getElementById('chat').getBoundingClientRect());
    arrBoundingRect.push(document.getElementById('info').getBoundingClientRect());
    arrBoundingRect.push(document.getElementById('tree').getBoundingClientRect());
    let boundingRect = arrBoundingRect.find((value) => {return value.width > 0;});
    let elmAspectRatio = Number(boundingRect.width) / Number(boundingRect.height);
    // calculate columns and rows
    let columns, rows;
    if(elmAspectRatio >= 1) {
      rows = Math.sqrt(streamsCount / elmAspectRatio);
      rows = Math.floor(rows);
      rows = rows>0 ? rows : 1;
      columns = streamsCount / rows;
      columns = Math.ceil(columns);
    } else {
      elmAspectRatio = 1 / elmAspectRatio;
      columns = Math.sqrt(streamsCount / elmAspectRatio);
      columns = Math.floor(columns);
      columns = columns>0 ? columns : 1;
      rows = streamsCount / columns;
      rows = Math.ceil(rows);
    }
    let columnSize = Math.floor(boundingRect.width / columns);
    columnSize = columnSize<256 ? 256 : columnSize;
    let rowSize = Math.floor(boundingRect.height / rows);
    rowSize = rowSize<144 ? 144 : rowSize;
    // update stream
    elmStreamFrontend.style.gridTemplateColumns = "repeat("+columns+", "+columnSize+"px)";
    elmStreamFrontend.style.gridTemplateRows = "repeat("+rows+", "+rowSize+"px)";
  }

  function toggleSpoiler(e) {
    e.preventDefault();
    const spoiler = this.getElementsByTagName('div')[0];
    if(spoiler.style.display != 'initial') {
      spoiler.style.display = 'initial';
    } else {
      spoiler.style.display = 'none';
    }
  }

  function roomDescription(id) {
    // get current room description
    let room = rooms.find((value) => {
      return value.id == id;
    });
    // if room has no description
    if(!room.description) {
      return;
    }
    // remove old description
    const elemInfo = document.getElementById("info");
    while (elemInfo.firstChild) {
      elemInfo.firstChild.remove();
    }
    // create new description
    let elemDescription = document.createElement("div");
    let strDescription = room.description + `
    [code]
    let a = 2;
      let b = 3;
        console.log(a+b);
    [/code]
    [code=js]
    let a = 2;
      let b = 3;
        console.log(a+b);
    [/code]
      
    [pre]
          This text is preformated.
        it keeps the spaces       .
    asdasdasdas
    [/pre]
    [spoiler]The hero dies at the end sdklfmsdmkfmsdlkflsd pfl dl fsld fsd fokdsijfiojsdui fjiosdfk[/spoiler]
    [spoiler=Mario]I save the pricess[/spoiler]
    `;
    bbcode.parsedToHTML(bbcode.parse(strDescription), elemDescription);
    elemInfo.appendChild(elemDescription);
  }

  function clientDisconnect(id, done) {
    // delete stream
    let elemClientMedia = document.getElementById("media-"+id);
    if(elemClientMedia) {
      elemClientMedia.remove();
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
    document.getElementById("room-1").remove();
    return done();
  }

});
