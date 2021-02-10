const socket = io();
import WRTC from './WRTC.mjs';
import BBCode from './BBCode.mjs';



function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}



let bbcode = new BBCode();
let clients;
let rooms;
let wrtc;



window.addEventListener('DOMContentLoaded', (event) => {

  /********HTML********/

  // default for small screen
  let columns = 1;
  let rows = 1;
  if(window.devicePixelRatio < 1.5) {
    // big screen
    columns = 2;
  }
  // page layout
  let elemPage = document.getElementById("page");
  elemPage.style.gridTemplateColumns = "repeat("+columns+", 1fr)";
  elemPage.style.gridTemplateRows = "repeat("+rows+", 1fr)";
  // view template
  let elemViewTemplate = document.createElement("div");
  elemViewTemplate.setAttribute('class', "view");
  // template menu
  let elemMenu = document.createElement("div");
  elemMenu.setAttribute('class', "menu");
  elemViewTemplate.appendChild(elemMenu);
  // template menu buttons
  let mode = ['tree', 'chat', 'stream', 'info'];
  for(const m of mode) {
    let elemMenuButton = document.createElement("button");
    elemMenuButton.setAttribute('class', "menu-button");
    elemMenuButton.innerText = m.toUpperCase();
    elemMenu.appendChild(elemMenuButton);
  }
  // backstage area
  let elemBackstage = document.createElement("div");
  elemBackstage.style.display = 'none';
  elemPage.appendChild(elemBackstage);
  // tree
  let elemTree = document.createElement("div");
  elemTree.setAttribute('id', mode[0]);
  elemTree.setAttribute('class', mode[0]);
  elemBackstage.appendChild(elemTree);
  // chat
  let elemChat = document.createElement("div");
  elemChat.setAttribute('id', mode[1]);
  elemChat.setAttribute('class', mode[1]);
  elemBackstage.appendChild(elemChat);
  // chat output
  let elemChatOutput = document.createElement("div");
  elemChatOutput.setAttribute('id', "chat-output");
  elemChat.appendChild(elemChatOutput);
  // chat input
  let elemChatInput = document.createElement("div");
  elemChatInput.setAttribute('id', "chat-input");
  elemChat.appendChild(elemChatInput);
  let elemChatInputForm = document.createElement("form");
  elemChatInput.appendChild(elemChatInputForm);
  elemChatInputForm.addEventListener('submit', cmdMessage, true);
  let elemChatInputFormMessage = document.createElement("input");
  elemChatInputFormMessage.setAttribute('id', "chat-input-message");
  elemChatInputFormMessage.setAttribute('type', "text");
  elemChatInputFormMessage.setAttribute('placeholder', "Enter Message...");
  elemChatInputFormMessage.setAttribute('autocomplete', "off");
  elemChatInputFormMessage.setAttribute('required', "true");
  elemChatInputForm.appendChild(elemChatInputFormMessage);
  let elemChatInputFormSend = document.createElement("input");
  elemChatInputFormSend.setAttribute('id', "chat-input-send");
  elemChatInputFormSend.setAttribute('type', "submit");
  elemChatInputFormSend.setAttribute('value', "SEND");
  elemChatInputForm.appendChild(elemChatInputFormSend);
  // stream
  let elemStream = document.createElement("div");
  elemStream.setAttribute('id', mode[2]);
  elemStream.setAttribute('class', mode[2]);
  elemBackstage.appendChild(elemStream);
  let elemStreamFrontend = document.createElement("div");
  elemStreamFrontend.setAttribute('id', "stream-frontend");
  elemStream.appendChild(elemStreamFrontend);
  let elemStreamBackend = document.createElement("div");
  elemStreamBackend.setAttribute('id', "stream-backend");
  elemStreamBackend.style.display = 'none';
  elemStream.appendChild(elemStreamBackend);
  // info
  let elemInfo = document.createElement("div");
  elemInfo.setAttribute('id', mode[3]);
  elemInfo.setAttribute('class', mode[3]);
  elemBackstage.appendChild(elemInfo);
  // fill every page grid item with a view
  let gridItemCount = columns * rows;
  for(let i = 0; i < gridItemCount; i++) {
    // create view from template
    let elemView = elemViewTemplate.cloneNode(true);
    // view content
    let elemContent = elemBackstage.getElementsByClassName(mode[i])[0];
    elemView.appendChild(elemContent);
    // add view to page grid
    elemPage.appendChild(elemView);
  }
  // menu event listeners
  let menuButtons = document.getElementsByClassName('menu-button');
  for(const b of menuButtons) {
    b.addEventListener('click', changeView);
  }

  function changeView(e) {
    console.log(e.target);
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
    e.preventDefault();
    let elemInput = document.getElementById('chat-input-message');
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
    elemMessage.innerHTML = bbcode.parse(message);
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
    let elemMedia = document.getElementById("media-"+id);
    if(state && elemMedia.parentElement.id != 'stream-backend') {
      // already enabled
      return;
    }
    if(!state && elemMedia.parentElement.id != 'stream-frontend') {
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
    let elemStream = document.getElementById("stream-frontend");
    let count = elemStream.childElementCount;
    count = state ? count+1 : count-1;
    console.log(count);
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
    console.log(columns);
    console.log(rows);
    // are we adding or removing
    if(state) {
      // change style
      elemStream.style.gridTemplateColumns = "repeat("+columns+", 1fr)";
      elemStream.style.gridTemplateRows = "repeat("+rows+", 1fr)";
      // add stream
      elemStream.appendChild(elemMedia);
    } else {
      // remove stream
      document.getElementById("stream-backend").appendChild(elemMedia);
      // change style
      elemStream.style.gridTemplateColumns = "repeat("+columns+", 1fr)";
      elemStream.style.gridTemplateRows = "repeat("+rows+", 1fr)";
    }
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
    elemDescription.innerHTML = bbcode.parse(room.description);
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
