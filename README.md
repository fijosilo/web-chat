# web-chat

This is a small web chat app created using Node.js, Express, Socket.IO and MariaDB.

## My objectives for this app

* Use only HTML/CSS/Javascript for the frontend.
* Use Node.js/Express for the backend.
* Don't store user chat/media data.

## Notes

* Audio is done using the Media API's
* The buffers are exchanged using Socket.IO

### Media API's PROS:
* The app only requires one server(Node.js)
* It's simpler to code

### Media API's CONS:
* Audio delay is bigger than in most voice apps

### WebRTC API PROS:
* Audio delay is smaller in theory

### WebRTC API CONS:
* The app would require two servers(Node.js/Signaling, STUN/TURN)
* STUN/TURN server would be very hard to program and would have to use someone's else server solution
