const SerialPort = require("serialport");
const EventEmitter = require("events");
const fs = require('fs');
const dataEmitter = new EventEmitter();
const express = require("express");
var app = express();
const http = require('http').Server(app);
var io = require("socket.io")(http);

const debounce = (func, delay) => {
    let debTimeout;
    return function() {
        var context = this,
            args = arguments;
        clearTimeout(debTimeout);
        debTimeout = setTimeout(() => func.apply(context, args), delay);
    }
}

var serial = new SerialPort('/dev/ttyACM0', {
    baudRate: 9600
})
var keys_values = JSON.parse(fs.readFileSync('keys_values.json'));

var chunks = [];
serial.on('data', d => {
    dataEmitter.emit('data', d);
    let arr = d.toString().split('');
    let isN = arr.indexOf('\n') != -1;
    chunks.push(d.toString());
    if (isN) {
        dataEmitter.emit('newline', chunks.join('').replace(/(\n|\r)/g, ''))
        chunks = [];
    }
})

var CarMP3 = ["CH-", "CH", "CH+", "PREV", "NEXT", "PLAY/PAUSE", "VOL-", "VOL+", "EQ", "0", "100+", "200+", "1", "2", "3", "4", "5", "6", "7", "8", "9"]

function* nextVal(arr) {
    let i = 0;
    while (i < arr.length) yield arr[i++];
}

var gen = nextVal(CarMP3);
var obj = {};

async function calibrate() {
    let val = gen.next();
    while (val.done == false) {
        process.stdout.write(val.value);
        process.stdout.write(" : ");
        var x = await new Promise(res => {
            var cb = debounce(data => {
                dataEmitter.removeListener('newline', cb);
                res(data);
            }, 150);
            dataEmitter.on('newline', cb)
        });
        obj[x] = val.value;
        console.log(x);
        val = gen.next();
    }
    fs.writeFileSync(`keys_values.json`, JSON.stringify(obj, null, 2));
}
//calibrate();


// SERVER

var songs = fs.readdirSync("music");

app.use(express.static("src"));

app.get('/', function(req, res) {
    res.end(fs.readFileSync('src/index.html'));
})
app.get('/api/get_song/:id', function(req, res) {
    let id = req.params.id;
    let buffer = fs.readFileSync(`music/${songs[id]}`);
    res.end(buffer);
})
app.get('/api/max_id', function(req, res) {
    res.json({
        maxID: songs.length - 1
    })
})

const port = 3100;

http.listen(port, function() {
    console.log(`Server started listening on port ${port}`);
})

dataEmitter.on("newline", debounce(line => {
    io.sockets.emit('IRC_VALUE', keys_values[line], line);
}, 100))