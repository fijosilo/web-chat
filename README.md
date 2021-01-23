# web-chat

This is a small web chat app created using express.

Objectives

Use only HTML/CSS/Javascript for the frontend.
Use Node.js/Express for the backend.
Don't store user chat/media data.

Thoughts

WebRTC API

WebRTC is out because it can't do p2p over the web, 
to comunicate over the web it requires a TURN server at witch point it's not p2p anymore it's p2s2p, 
so a normal webserver based app except:
    i don't know how to program one,
    from what i read it's quite complex,
    only know of one open source project,
    they are usually coded in low level languages like C.


Media API's

the workflow is:
    use window.navigator.mediaDevices.getUserMedia() to get a MediaStream,
    use a MediaRecorder to record the MediaStream in buffers of fixed size,
    send the buffers to the client thru the server,
    create a MediaSource and connect it to a dom media element,
    add a SourceBuffer to the MediaSource and append the buffers.

The only problem so far is that it has a big delay can't quite figure out why, but here's what i measured:
    from MediaStream directly to a dom media element, by earing(subject to reaction time influences), about 200ms, 
        (that's about the same as client to server to client in other voice apps)
    for recording i'm using buffers of 100ms, so a delay of 100ms to record,
    sending buffer to the other client thru the server took 68ms,
        (the other client was a virtual machine and ping to it from local client varied from 5-60ms)
    appending buffer to SourceBuffer and waiting for dom media element oncanplay 122ms
This amounts to 200+100+68+122 = 490ms, so about half a second however, by earing(subject to reaction time influences) i measure about 800ms.
I think 4/5 of second of delay isn't exactly good for a real time comunication app, 
but i don't know how to reduce it or even if it's possible to reduce it, 
i don't even know where those extra 300ms of delay are coming from.


Conclusions of atempting to create this app
Ultimately a proper real time media comunicating app programed with javascript exclusively might not be possible, 
the WebRTC API requires outside servers and the Media API's alone are not enouch nor designed for streaming.
