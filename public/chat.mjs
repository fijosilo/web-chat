const socket = io();
//import WRTC from './WRTC.mjs';
import Receptor from './Receptor.mjs';



  // micro stream delay about 200ms give or take cause of reaction time
  // recording 100ms
  // reaching virtual machine 60ms but ping to it varies from 5-60
  // receiving till oncanplay 120ms
  // from virtual machine till speakers about 300-400ms

window.addEventListener('load', () => {
  /********VARIABLES********/
  console.log('WINDOW LOAD');

  let clients;
  let rooms;

  let tree = document.getElementById('tree').getElementsByTagName('div')[0];
  let chatOutput = document.getElementById('chatOutput').getElementsByTagName('div')[0];

  document.getElementById('chatInput').addEventListener('submit', cmdMessage, true);

  /********Media API's********/

  let media = {};
  let feedback = document.getElementById('stream-feedback');
  function cmdToggleMicrophone(e) {
    ping();
    if(media.recorder) {
      let elemMicrophoneImg = document.getElementById('client-microphone').getElementsByTagName('img')[0];
      switch(media.recorder.state) {
        case 'recording':
          media.recorder.pause();
          elemMicrophoneImg.src = "../public/media/microphone_off.svg";
          break;
        case 'paused':
          media.recorder.resume();
          elemMicrophoneImg.src = "../public/media/microphone_on.svg";
          break;
        case 'inactive':
          break;
        default:
          break;
      }
    } else {
      // initialize
      let constraints = {audio: true, video: false};
      window.navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          media.stream = stream;
          //feedback.srcObject = media.stream;
          //feedback.onloadedmetadata = () => {feedback.play();};
          media.recorder = new MediaRecorder(stream, {mimeType: 'audio/webm;codecs=opus'});
          media.recorder.ondataavailable = function(e) {
            socket.emit('eventStreamAudio', {blob: e.data});
          };
          media.recorder.start(100);
          // change icon
          let elemMicrophoneImg = document.getElementById('client-microphone').getElementsByTagName('img')[0];
          elemMicrophoneImg.src = "../public/media/microphone_on.svg";
        })
        .catch((err) => {
          console.log(err);
          return;
        });
    }
  }

  let firstBlob = true;
  socket.on('eventStreamAudio', (data) => {
    if(firstBlob) {
      firstBlob = false;
      socket.emit('ping');
    }
    clients[data.id].receptor.addBlob(data.blob);
  });





  let pingTest;
  let startdate;
  let enddate;
  function ping() {
    pingTest = true;
    startdate = new Date();
    socket.emit('ping');
  }
  let datenow;
  socket.on('ping', () => {
    if(pingTest) {
      enddate = new Date();
      console.log(enddate - startdate);
    } else {
      socket.emit('ping');
    }
  });

  /********WebRTC********/
/*
  let wrtc = new WRTC(sendSignal, eventMessage);

  function sendSignal(signal) {
    socket.emit('wrtcSignal', signal);
  }

  socket.on('wrtcSignal', function(signal) {
    wrtc.signal(signal);
  });

  function eventMessage(id, channel, message) {
    clientMessage(id, message, () => {
      console.log('Client message');
    });
  }
*/
  /********SOCKETS********/

  socket.on('connection', function() {
    console.log('Connected');
  });

  socket.on('connected', function(data) {
    clients = data.clients;
    rooms = data.rooms;
    console.log('Loading rooms...');
    loadRooms(rooms, tree, () => {
      console.log('Loading clients...');
      loadClients(clients, () => {
        console.log('Loaded');
      });
    });
  });

  socket.on('eventConnect', (data) => {
    clientConnect(data.id, data.client, () => {
      console.log('Client connected');
    });
  });

  socket.on('eventMove', (data) => {
    clientMove(data.id, data.room, () => {
      console.log('Client moved');
      // webrtc
      /*
      if(data.id == socket.id) {
        Object.entries(clients).forEach(([key, value]) => {
          if(key != socket.id && value.room == clients[socket.id].room) {
            wrtc.openChannel(key, clients[socket.id].room);
          }
        });
      }
      */
      //
    });
  });

  socket.on('eventDisconnect', (data) => {
    clientDisconnect(data.id, () => {
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
    socket.emit('cmdMessage', {message: message});
    //webrtc
    Object.entries(clients).forEach(([key, value]) => {
      if(key != socket.id && value.room == clients[socket.id].room) {
        wrtc.sendMessage(key, clients[socket.id].room, message);
      }
    });
  }

/*
  function cmdToggleMicrophone(e) {
    //
  }
*/

  function cmdToggleCamera(e) {
    //
  }

  /********DOM********/

  function loadRooms(arrRooms, elemRoot, done=null, iteration=3) {
    if(iteration < 7) {
      for(const room of arrRooms) {
        // room container element
        let elemRoom = document.createElement('div');
        elemRoom.setAttribute('id', "room-"+room.name);
        elemRoom.setAttribute('class', "room");
        // room title element
        let elemRoomTitle;
        // room type
        if(room.access == 'DENY') {
          // division
          elemRoom.setAttribute('style', "text-align: center;");
          elemRoomTitle = document.createElement("h"+iteration);
          elemRoomTitle.innerText = room.name;
        } else {
          // room
          elemRoom.setAttribute('style', "text-align: left;");
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
    // client microphone and speaker elements
    let elemClientCamera;
    let elemClientMicrophone;
    let elemClientSpeaker;
    if(id == socket.id) {
      // client camera element
      elemClientCamera = document.createElement('button');
      elemClientCamera.setAttribute('id', "client-camera");
      elemClientCamera.setAttribute('class', "client-camera");
      let elemClientCameraImg = document.createElement('img');
      elemClientCameraImg.setAttribute('src', "../public/media/camera_off.svg");
      elemClientCameraImg.setAttribute('alt', "camera");
      elemClientCameraImg.setAttribute('width', "20");
      elemClientCameraImg.setAttribute('height', "20");
      elemClientCamera.appendChild(elemClientCameraImg);
      elemClientCamera.addEventListener('click', cmdToggleCamera);
      // client microphone element
      elemClientMicrophone = document.createElement('button');
      elemClientMicrophone.setAttribute('id', "client-microphone");
      elemClientMicrophone.setAttribute('class', "client-microphone");
      let elemClientMicrophoneImg = document.createElement('img');
      elemClientMicrophoneImg.setAttribute('src', "../public/media/microphone_off.svg");
      elemClientMicrophoneImg.setAttribute('alt', "microphone");
      elemClientMicrophoneImg.setAttribute('width', "20");
      elemClientMicrophoneImg.setAttribute('height', "20");
      elemClientMicrophone.appendChild(elemClientMicrophoneImg);
      elemClientMicrophone.addEventListener('click', cmdToggleMicrophone);
      // client speaker element
      elemClientSpeaker = document.createElement('button');
      elemClientSpeaker.setAttribute('id', "client-speaker");
      elemClientSpeaker.setAttribute('class', "client-speaker");
      let elemClientSpeakerImg = document.createElement('img');
      elemClientSpeakerImg.setAttribute('src', "../public/media/speaker_on.svg");
      elemClientSpeakerImg.setAttribute('alt', "speaker");
      elemClientSpeakerImg.setAttribute('width', "20");
      elemClientSpeakerImg.setAttribute('height', "20");
      elemClientSpeaker.appendChild(elemClientSpeakerImg);
    } else {
      // client camera element
      elemClientCamera = document.createElement('img');
      elemClientCamera.setAttribute('class', "client-camera");
      elemClientCamera.setAttribute('src', "../public/media/camera_off.svg");
      elemClientCamera.setAttribute('alt', "camera");
      elemClientCamera.setAttribute('width', "20");
      elemClientCamera.setAttribute('height', "20");
      // client microphone element
      elemClientMicrophone = document.createElement('img');
      elemClientMicrophone.setAttribute('class', "client-microphone");
      elemClientMicrophone.setAttribute('src', "../public/media/microphone_off.svg");
      elemClientMicrophone.setAttribute('alt', "microphone");
      elemClientMicrophone.setAttribute('width', "20");
      elemClientMicrophone.setAttribute('height', "20");
      // client speaker element
      elemClientSpeaker = document.createElement('img');
      elemClientSpeaker.setAttribute('class', "client-speaker");
      elemClientSpeaker.setAttribute('src', "../public/media/speaker_on.svg");
      elemClientSpeaker.setAttribute('alt', "speaker");
      elemClientSpeaker.setAttribute('width', "20");
      elemClientSpeaker.setAttribute('height', "20");
      // audio output
      let elemClientAudio = document.createElement('audio');
      elemClientAudio.setAttribute('class', "client-audio");
      elemClientAudio.setAttribute('style', "display: none;");
      client.receptor = new Receptor('audio/webm;codecs=opus', elemClientAudio);
      elemClient.appendChild(elemClientAudio);
    }
    elemClient.appendChild(elemClientCamera);
    elemClient.appendChild(elemClientMicrophone);
    elemClient.appendChild(elemClientSpeaker);
    return done(elemClient);
  }

  function clientConnect(id, client, done) {
    // update clients
    clients[id] = client;
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

  function clientMessage(id, message, done) {
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
    elemMessageTime.innerText = time.getHours()+':'+time.getMinutes()+':'+time.getSeconds();
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

  function clientDisconnect(id, done) {
    // get client element
    let elemClient = document.getElementById('client-'+id);
    // if element exists
    if(elemClient) {
      // remove element
      elemClient.remove();
    }
    // update clients
    delete clients[id];
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
