require('dotenv').config();
const bcrypt = require('bcrypt');
const bcryptSaltRounds = bcrypt.genSaltSync(Number(process.env.BCRYPT_SALTROUNDS));
const mariadb = require('mariadb');
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER, 
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE
});

class Database {

  constructor() {
    pool.getConnection()
    .then(conn => {
      let sql = `CREATE TABLE IF NOT EXISTS rooms (
        id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
        parent_id INT NOT NULL,
        sibling_id INT DEFAULT 0,
        division TINYINT(1) DEFAULT 0,
        name VARCHAR(32) COLLATE latin1_general_ci NOT NULL UNIQUE,
        protected TINYINT(1) DEFAULT 0,
        password VARCHAR(60) DEFAULT NULL,
        description VARCHAR(8192) DEFAULT NULL
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

  loadRooms() {
    return new Promise((resolve, reject) => {
      pool.getConnection()
      .then(conn => {
        let sql = `WITH RECURSIVE tree_cte AS
          (
            SELECT R.id, R.parent_id, R.sibling_id, R.division, R.name, R.protected, R.description FROM rooms AS R WHERE R.id=1
            UNION
            SELECT r.id, r.parent_id, r.sibling_id, r.division, r.name, r.protected, r.description FROM tree_cte
            INNER JOIN rooms AS r
            ON tree_cte.id = r.parent_id
          )SELECT * FROM tree_cte ORDER BY parent_id, sibling_id, name;`;
        conn.query(sql)
        .then(result => {
          // close db connection
          conn.end();
          result.shift();
          resolve(result);
        })
        .catch(err => {
          // close db connection
          conn.end();
          reject(err);
        });
      })
      .catch(err => {
        reject(err);
      });
    });
  }

}

module.exports = Database;