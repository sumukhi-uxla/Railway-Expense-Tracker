const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool that matches your .env configurations
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Export the promise-based version so we can use modern async/await syntax
module.exports = pool.promise();