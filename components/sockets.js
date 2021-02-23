require('dotenv').config();
const Database = require('../components/database.js');
const db = new Database();

module.exports = async function(io) {
  let iceservers = {
    iceServers: [
      {
        'urls': 'stun:' + process.env.STUN_SERVER,
        'credential': process.env.STUN_PASS,
        'username': process.env.STUN_USER
      },
      {
        'urls': 'turn:' + process.env.TURN_SERVER,
        'credential': process.env.TURN_PASS,
        'username': process.env.TURN_USER
      }
    ]
  };

  let rooms;
  await db.loadRooms()
  .then((res) => {
    rooms = res;
  })
  .catch((err) => {
    console.error(err);
  });

  let clients = {};

  let wrtcPolite = {};

  // sockets
  io.on('connection', socket => {
    // CLIENT CONNECTED
    console.log('CLIENT CONNECTED');
    // update server
    clients[socket.id] = {
      username: socket.request.user.username,
      room: '',
      media: {
        camera: false,
        monitor: {},
        microphone: false,
        speaker: {}
      }
    };
    wrtcPolite[socket.id] = {};
    Object.keys(clients).forEach((key) => {
      if(key != socket.id) {
        wrtcPolite[socket.id][key] = true;
      }
      clients[socket.id].media.monitor[key] = true;
      clients[socket.id].media.speaker[key] = true;
    });
    // update clients
    socket.emit('connected', {clients: clients, rooms: rooms, iceservers: iceservers, polite: wrtcPolite[socket.id]});
    socket.broadcast.emit('eventConnect', {id: socket.id, client: clients[socket.id]});



    // WEBRTC SIGNAL
    socket.on('wrtcSignal', (data) => {
      data.activator = socket.id;
      io.to(data.target).emit('wrtcEventSignal', data);
    });

    // CLIENT CHANGED ROOM
    socket.on('cmdMove', (data) => {
      if(data.room != clients[socket.id].room) {
        // update server
        socket.leave("room-"+clients[socket.id].room);
        clients[socket.id].room = data.room;
        socket.join("room-"+data.room);
        // update clients
        io.emit('eventMove', {id: socket.id, room: data.room});
      }
    });

    // CLIENT MEDIA
    socket.on('cmdMedia', (data) => {
      data.activator = socket.id;
      switch(data.type) {
        case 'camera':
        case 'microphone':
          if(data.target != data.activator) {
            // client can't toggle others camera or microphone
            return;
          }
          clients[data.activator].media[data.type] = data.state;
          io.emit('eventMedia', data);
          break;
        case 'monitor':
        case 'speaker':
          clients[data.activator].media[data.type][data.target] = data.state;
          if(data.target == socket.id) {
            // client toggled himself inform everyone
            io.emit('eventMedia', data);
          } else {
            // client toggled remote client inform client and remote client
            io.to(data.target).emit('eventMedia', data);
            io.to(socket.id).emit('eventMedia', data);
          }
          break;
        default:
          break;
      }
    });



    // CLIENT DISCONNECTED
    socket.on('disconnect', () => {
      console.log('CLIENT DISCONNECTED');
      // update server
      delete clients[socket.id];
      delete wrtcPolite[socket.id];
      // update clients
      socket.broadcast.emit('eventDisconnect', {id: socket.id});
    });
  });

}
