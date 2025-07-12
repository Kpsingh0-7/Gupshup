// import mysql from 'mysql2/promise';
// export const pool = mysql.createPool({
//  host: 'localhost', // replace with your DB host
//  user: 'markreac_root', // replace with your DB user
//  password: 'Kpsingh@1234', // replace with your DB password
//  database: 'markreac_market' // replace with your DB name
// });

// import mysql from "mysql2/promise";

// export const pool = mysql.createPool({
//   host: "metro.proxy.rlwy.net",
//   port: 36878,
//   user: "root",
//   password: "uHJEthyFZBfoyySYikFaIEjguNdxUDZC",
//   database: "railway",
// });

import mysql from "mysql2/promise";

export const pool = mysql.createPool({ 
  host: '195.201.175.72',
  user: 'kpremote',
  port: '3306',
  password: 'z*4QO2HFfEsR4YM%',
  database: 'marketing',
  timezone: 'Z' // "Z" means UTC
});

// Force UTC for MySQL session too
pool.on('connection', function (connection) {
  connection.query("SET time_zone = '+00:00'");
});
