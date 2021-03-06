// This ensures that things do not fail silently but will throw errors instead.
"use strict";
const Database = require('better-sqlite3');

// Connect to a database or create one if it doesn't exist yet.
const db = new Database('log.db');

// Is the database initialized or do we need to initialize it?
const stmt = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' and name='accesslog';`
    );
// Define row using `get()` from better-sqlite3
// Used file from march 8 demo

let row = stmt.get();
if (row === undefined) {
    console.log('Your database appears to be empty. I will initialize it now.');
// initialize the database.
    const sqlInit = `
        CREATE TABLE accesslog ( id INTEGER PRIMARY KEY, remoteaddr TEXT, remoteuser TEXT, time TEXT, method TEXT, url TEXT, protocol TEXT, httpversion TEXT, secure TEXT, status TEXT, referer TEXT, useragent TEXT )`;
        // INSERT INTO accesslog (username, password) VALUES ('user1','supersecurepassword'),('test','anotherpassword');
     
// Execute SQL commands that we just wrote above.
    db.exec(sqlInit);
// Echo information about what we just did to the console.
    console.log('Your database has been initialized.');
} else {
// Since the database already exists, echo that to the console.
    console.log('Database exists.')
}
// Export all of the above as a module so that we can use it elsewhere.
module.exports = db