// REQUIREMENTS
require('dotenv').config();
const express = require('express');
const app = express();
const fs = require('fs');
let privateKey = fs.readFileSync( './ssl/server.key' );
let certificate = fs.readFileSync( './ssl/server.crt' );
const helmet = require('helmet');
const routes = require('./components/routes.js');

const passport = require('passport');
const LocalStrategy = require('passport-local');
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const KnexSessionStore = require('connect-session-knex')(session);
const Knex = require('knex');
const knex = Knex({
  client: 'mysql',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE,
  },
});
const store = new KnexSessionStore({knex});

const Authenticate = require('./components/authenticate.js');
const auth = new Authenticate();

const https = require('https').createServer({key: privateKey, cert: certificate}, app);
const io = require('socket.io')(https);
const sockets = require('./components/sockets.js');

// SETUP
// security settings
/*
app.use(helmet({
  hidePoweredBy: {
    setTo: ''
  },
  frameguard: {
    action: 'SAMEORIGIN'
  },
  referrerPolicy: {
    policy: 'same-origin'
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:["'self'"],
      styleSrc:["'self'"]
    }
  }
}));
*/
// css and javascript folder
app.use('/public', express.static(process.cwd() + '/public'));
// process json and string/array requests and store them in req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// passport
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: {secure: false},
  key: 'chat.sid',
  store: store
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({usernameField : 'username', passwordField : 'password', passReqToCallback: true}, auth.auth));
passport.serializeUser(auth.serializeUser);
passport.deserializeUser(auth.deserializeUser);
// sockets with passport
io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,
  key: 'chat.sid',
  secret: process.env.SESSION_SECRET,
  store: store,
  success: function(data, accept) {
    accept(null, true);
  },
  fail: function(data, message, error, accept) {
    accept(null, false);
  }
}));

// ROUTING
routes(app);

// SOCKETS
sockets(io);

// START SERVER
const PORT = process.env.PORT || 443;
https.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
