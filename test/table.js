'use strict';

let tms = require('table-master-stream'),
    bridge = require('bridge.js'),
    seat = bridge.seat,
    process = require('process'),
    net = require('net');

function TestTable(cb) {
    var port = 3000,
        host = 'localhost';
    var server = net.createServer(socket => {
        console.log('table new connection');
        function send(msg) {
            console.log('table sending', msg);
            socket.write(msg + '\r\n');
        }
        socket
            .pipe(tms())
            .on('data', m => console.log('table received', m))
            .on('connect', m => send(`${seat[m.seat].name} "${m.teamName}" seated`));
    });
    server.listen(port, host, () => {
        process.nextTick(() => {
            var client = net.connect(port, host,  () => {
                cb(client);
            });
        });
    });
}

module.exports = TestTable;
