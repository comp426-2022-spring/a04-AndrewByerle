// import reqire if it doesn't work
const args = require('minimist')(process.argv.slice(2), {
    default: {
        debug: 'false',
        log: 'true'
    }
})

var port = args.port || 5555

if (args.help != null) {
    const indent = '             ';
    console.log('server.js [options]' + '\n\n' +

        '--port	    Set the port number for the server to listen on. Must be an integer' + '\n' + indent +
        'between 1 and 65535.' + '\n\n' +

        '--debug    If set to `true`, creates endlpoints /app/log/access/ which returns' + '\n' + indent +
        'a JSON access log from the database and /app/error which throws' + '\n' + indent +
        'an error with the message "Error test successful." Defaults to' + '\n' + indent +
        '`false`.' + '\n\n' +

        '--log      If set to false, no log files are written. Defaults to true.' + '\n' + indent +
        'Logs are always written to database.' + '\n\n' +

        '--help	    Return this message and exit.')
    process.exit(0);
}



const express = require('express')
const app = express()
const db = require("./database.js")
const fs = require("fs")
const morgan = require("morgan")
// Make Express use its own built-in body parser for both urlencoded and JSON body data.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function coinFlip() {
    return Math.random() > .5 ? ("heads") : ("tails");
}

function coinFlips(flips) {

    let array = [];
    for (let i = 0; i < flips; i++) {
        array.push(coinFlip());
    }
    return array;
}

function countFlips(array) {
    var count = { tails: 0, heads: 0 }

    for (const result of array) {
        if (result == "heads") {
            count.heads += 1;
        }
        else if (result == "tails") {
            count.tails += 1;
        }
        else {
            console.error("not valid countFlips");
        }
    }
    return count;

}

function flipACoin(call) {
    var result = { call: call, flip: coinFlip(), result: null }
    result.result = result.flip == result.call ? "win" : "lose";
    return result;
}

if (args.log === 'true') {
    // Use morgan for logging to files
    // Create a write stream to append (flags: 'a') to a file
    const logStream = fs.createWriteStream('./access.log', { flags: 'a' })
    // Set up the access logging middleware
    app.use(morgan('combined', { stream: logStream }))
}

// Backticks are used for fstring syntax
const server = app.listen(port, () => {
    // console.log(`App is running on port ${port}`)
    console.log('App is running on port %PORT%'.replace('%PORT%', port))
})

app.get('/app/', (req, res) => {
    res.json({ "message": "Your API works! (200)" });
    res.status(200);
})

app.get('/app/flips/:number', (req, res) => {
    var array = coinFlips(req.params.number);
    var tally = countFlips(array)
    res.status(200).json({ 'raw': array, 'summary': tally })
})

app.get('/app/flip', (req, res) => {
    var flip = coinFlip();
    res.status(200).json({ "flip": flip })
})

app.get('/app/flip/call/:x', (req, res) => {
    res.status(200).json(flipACoin(req.params.x))
})

// allows endpoint to be /app/flip/call/heads/ or /app/flip/call/tails
app.get('/app/flip/call/:guess(heads|tails)/', (req, res) => {
    res.status(200).json(flipACoin(req.params.guess))
})

app.get("/app/log/access", (req, res) => {
    // returns all records in accesslog table
    try {
        const stmt = db.prepare('SELECT * FROM accesslog').all()
        res.status(200).json(stmt)
    } catch (e) {
        console.error(e)
    }
});

app.get("/app/error", (req, res) => {
    res.status(500).send('Error test successful')
})

// Default response for any other request
app.use((req, res, next) => {
    if (args.debug === 'true') {
        // Your middleware goes here.
        let logdata = {
            remoteaddr: req.ip,
            remoteuser: req.user,
            time: Date.now(),
            method: req.method,
            url: req.url,
            protocol: req.protocol,
            httpversion: req.httpVersion,
            secure: req.secure,
            status: res.statusCode,
            referer: req.headers['referer'],
            useragent: req.headers['user-agent']
        }
        try {
            // const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, secure, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            // const info = stmt.run(req.ip, req.user, Date.now(), req.method, req.url, req.protocol, req.httpVersion, req.secure, req.statusCode, req.headers['referer'], req.headers['user-agent'])
            const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, secure, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            const info = stmt.run(String(logdata.remoteaddr), String(logdata.remoteuser), String(logdata.time), String(logdata.method), String(logdata.url), String(logdata.protocol), String(logdata.httpversion), String(logdata.secure), String(logdata.status), String(logdata.referer), String(logdata.useragent));
            // const kill = db.prepare('TRUNCATE TABLE accesslog')
            res.status(200).json(info)
        } catch (e) {
            console.error(e)
        }
    }


    // add default message?
    next()
});



process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Server stopped')
    })
})