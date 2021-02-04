require('dotenv').config();
const bcrypt = require('bcrypt');
const bcryptSaltRounds = bcrypt.genSaltSync(Number(process.env.BCRYPT_SALTROUNDS));
const {v1: uuidV1} = require('uuid');
const {version: uuidVersion} = require('uuid');
const {validate: uuidValidate} = require('uuid');
const mariadb = require('mariadb');
const pool = mariadb.createPool({
  host: process.env.DB_HOST, 
  user: process.env.DB_USER, 
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
  connectionLimit: 5
});

class Authenticate {

  constructor() {
    pool.getConnection()
    .then(conn => {
      let sql = `CREATE TABLE IF NOT EXISTS users (
        id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(32) COLLATE latin1_general_ci NOT NULL UNIQUE,
        password VARCHAR(60) NOT NULL,
        email NVARCHAR(254) UNIQUE
        )`;
      conn.query(sql)
      .then(result => {
        // close db connection
        conn.end();
      })
      .catch(err => {
        // close db connection
        conn.end();
        console.log(err);
      });
    })
    .catch(err => {
      console.log(err);
    });
  }

  serializeUser(user, done) {
    if(Number(user.id)) {
      // user is registered
      return done(null, user.id);
    } else {
      // user is anonymous
      // get username without the ANON prefix
      let username = user.username.slice(user.username.indexOf(' ')+1);
      return done(null, user.id + ' ' + username);
    }
  }

  deserializeUser(id, done) {
    if(Number(id)) {
      // user is registered
      // look for id in the database
      pool.getConnection()
      .then(conn => {
        let sql = "SELECT id, username, password FROM users WHERE id = ?";
        conn.query(sql, id)
        .then(result => {
          // make sure the connection is closed when we finish using it or we will start to get timeout errors
          conn.end();
          if(result[0]) {
            return done(null, result[0]);
          } else {
            return done(null, false, {message: "Invalid user id"});
          }
        })
        .catch(error => {
          // make sure the connection is closed when we finish using it or we will start to get timeout errors
          conn.end();
          console.log(error);
          return done("Could not search the database");
        });
      })
      .catch(error => {
        console.log(error);
        return done("Could not connect to the database");
      });
    } else {
      // user is anonymous
      let uuid = id.slice(0, id.indexOf(' '));
      let username = 'ANON ' + id.slice(id.indexOf(' ')+1);
      if(uuidValidate(uuid) && uuidVersion(uuid) === 1) {
        // valid uuid
        return done(null, {id: id, username: username, password: '********'});
      } else {
        // invalid uuid
        return done(null, false, {message: "Invalid user id"});
      }
    }
  }

  auth(req, username, password, done) {
    // validate username
    if(!username || username.match(/^[\s]*$/)) {return done(null, false, {code: 'username', error: "Required field 'username' missing"});}
    // init variables
    let email = req.body.email;
    let mode = req.body.mode;
    let sql = "";
    // choose mode
    if(!mode) {return done(null, false, {code: 'mode', error: "Required field 'mode' missing"});}
    switch(mode) {
      case 'Anonymous':
        username = 'ANON ' + username;
        let id = uuidV1();
        return done(null, {id: id, username: username, password: password});
        break;
      case 'Login':
        // validate password
        if(!password) {return done(null, false, {code: 'password', error: "Required field 'password' missing"});}
        // look for user in the database
        pool.getConnection()
        .then(conn => {
          sql = "SELECT id, username, password FROM webserver.users WHERE username = ?";
          conn.query(sql, username)
          .then(result => {
            // make sure the connection is closed when we finish using it or we will start to get timeout errors
            conn.end();
            if(!result[0]) {
              return done(null, false, {code: 'username', error: "Incorrect username"});
            }
            if(!bcrypt.compareSync(password, result[0].password)) {
              return done(null, false, {code: 'password', error: "Incorrect password"});
            }
            return done(null, result[0]);
          })
          .catch(error => {
            console.log(error);
            return done("Could not search the database");
          });
        })
        .catch(error => {
          console.log(error);
          return done("Could not connect to the database");
        });
        break;
      case 'Register':
        // TODO: dont' allow usernames starting in 'ANON '
        // validate password and email
        if(!password) {return done(null, false, {code: 'password', error: "Required field 'password' missing"});}
        if(!email) {return done(null, false, {code: 'email', error: "Required field 'email' missing"});}
        // TODO: validate email
        if(email.length > 254) {return next("Email is invalid");}
        // register the user in the database
        pool.getConnection()
        .then(conn => {
          let hash = bcrypt.hashSync(password, bcryptSaltRounds);
          sql = "INSERT INTO webserver.users (username, password, email) VALUES (?, ?, ?)";
          conn.query(sql, [username, hash, email])
          .then(result => {
            // user has been registered find it in the database and pass it to passport
            sql = "SELECT id, username, password FROM webserver.users WHERE id = ?";
            conn.query(sql, result.insertId)
            .then(result => {
              // make sure the connection is closed when we finish using it or we will start to get timeout errors
              conn.end();
              return done(null, result[0]);
            })
            .catch(error => {
              // make sure the connection is closed when we finish using it or we will start to get timeout errors
              conn.end();
              return done(error);
            });
          })
          .catch(error => {
            // make sure the connection is closed when we finish using it or we will start to get timeout errors
            conn.end();
            let message = {
              code: '',
              error: error
            };
            if(error.code == 'ER_DUP_ENTRY' || error.errno == 1062) {
              let key = error.message.match(/for key '([^']+)'/)[1];
              let value = error.message.match(/Duplicate entry '([^']+)'/)[1];
              message.code = key;
              message.error = "The "+key+" '"+value+"' is already registered";
            }
            return done(null, false, {code: 'mode', error: "Incorrect mode"});
          });
        })
        .catch(error => {
          return done(error);
        });
        break;
      default:
        return done(null, false, {code: 'mode', error: "Incorrect mode"});
    }
    //return done("Something went wrong with the auth");
  }

}

module.exports = Authenticate;