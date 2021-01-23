const fs = require('fs');

module.exports = function(io) {

  // load divisions and chat rooms
  //let divisions = JSON.parse(fs.readFileSync('assets/tree.json', 'utf8'));

  let rooms = [
    {
      name: 'Lobby',
      description: '',
      access: 'DENY',
      rooms: [
        {
          name: 'Rules',
          description: '',
          access: 'ALLOW',
          rooms: []
        },
        {
          name: 'Welcome',
          description: '',
          access: 'ALLOW',
          rooms: []
        }
      ]
    },
    {
      name: 'Lounge',
      description: '',
      access: 'DENY',
      rooms: [
        {
          name: 'Lounge ¹',
          description: '',
          access: 'ALLOW',
          rooms: []
        },
        {
          name: 'Lounge ²',
          description: '',
          access: 'ALLOW',
          rooms: []
        },
        {
          name: 'Lounge ³',
          description: '',
          access: 'ALLOW',
          rooms: []
        }
      ]
    },
    {
      name: 'Games',
      description: '',
      access: 'DENY',
      rooms: []
    },
    {
      name: 'Guests',
      description: '',
      access: 'DENY',
      rooms: []
    }
  ]
  let clients = {};

  // sockets
  io.on('connection', socket => {
    // CLIENT CONNECTED
    console.log('CLIENT CONNECTED');
    // update server
    clients[socket.id] = {
      username: socket.request.user.username,
      room: ''
    };
    // update clients
    socket.emit('connected', {clients: clients, rooms: rooms});
    socket.broadcast.emit('eventConnect', {id: socket.id, client: clients[socket.id]});


    // WEBRTC SIGNAL
    socket.on('wrtcSignal', (data) => {
      data.activator = socket.id;
      io.to(data.target).emit('wrtcSignal', data);
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

    // CLIENT SENT MESSAGE
    socket.on('cmdMessage', (data) => {
      data.id = socket.id;
      io.in("room-"+clients[socket.id].room).emit('eventMessage', data);
    });

    // CLIENT SENT AUDIO
    socket.on('eventStreamAudio', (data) => {
      data.id = socket.id;
      socket.broadcast.emit('eventStreamAudio', data);
    });

    // PING
    socket.on('ping', () => {
      socket.broadcast.emit('ping');
    });

    // CLIENT DISCONNECTED
    socket.on('disconnect', () => {
      console.log('CLIENT DISCONNECTED');
      // update server
      delete clients[socket.id];
      // update clients
      socket.broadcast.emit('eventDisconnect', {id: socket.id});
    });
  });

}
