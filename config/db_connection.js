const mysql = require("mysql2");

// Database configuration for both development and production
const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "mysql",
    database: process.env.DB_NAME || "bole_based_blog_db",
    port: process.env.DB_PORT || 3306,
    
    // Additional recommended options for production
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

// Create connection pool (better for production)
const db = mysql.createPool(dbConfig);

// Test the connection
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
        console.log("⚠️  Trying to connect with:");
        console.log("   Host:", dbConfig.host);
        console.log("   User:", dbConfig.user);
        console.log("   Database:", dbConfig.database);
        
        // Try to create a basic connection if pool fails
        const fallbackConn = mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database,
            port: dbConfig.port
        });
        
        fallbackConn.connect((fallbackErr) => {
            if (fallbackErr) {
                console.error("❌ Fallback connection also failed:", fallbackErr.message);
            } else {
                console.log("✅ Connected with fallback connection");
                fallbackConn.end();
            }
        });
    } else {
        console.log(`✅ Database connected successfully to: ${dbConfig.host}`);
        console.log(`   Database: ${dbConfig.database}`);
        console.log(`   User: ${dbConfig.user}`);
        
        // Release the connection back to pool
        connection.release();
    }
});

// Handle connection errors
db.on('error', (err) => {
    console.error('Database error:', err.message);
    
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Database connection was closed. Reconnecting...');
    } else if (err.code === 'ER_CON_COUNT_ERROR') {
        console.log('Database has too many connections.');
    } else if (err.code === 'ECONNREFUSED') {
        console.log('Database connection was refused.');
    }
});

module.exports = db;













// const mysql = require("mysql2");




// const db = mysql.createConnection({
//     host:"localhost",
//     user:"root",
//     password: "mysql",
//     database:"bole_based_blog_db"
// })

// db.connect((err)=>{
//      if (err) {
//         console.error("❌ Database connection failed:", err.message);
//     } else {
//         console.log("✅ Database connected successfully");
//     }
// });

// module.exports=db;