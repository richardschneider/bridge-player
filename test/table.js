'use strict';

let tms = require('table-master-stream'),
    process = require('process'),
    net = require('net');

/*
 * A simple table that always sends 'end of sesssion' on a connect message.
 */
function TestTable(cb) {
    var port = 3000,
        host = 'localhost';
    var server = net.createServer(socket => {
        function send(msg) {
            socket.write(msg + '\r\n');
        }
        socket
            .pipe(tms())
            .on('connect', () => send(`end of session`));
    });
    server.listen(port, host, () => {
        process.nextTick(() => {
            var client = net.connect(port, host,  () => {
                cb(client);
            });
            client.on('end', () => server.close());
        });
    });
}

module.exports = TestTable;
