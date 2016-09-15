'use strict';

let tms = require('table-master-stream'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    bridge = require('bridge.js'),
    seat = bridge.seat;

function BridgePlayer(opts) {
    opts = opts || {};
    this.seat = opts.seat || seat.south;
    this.teamName = opts.teamName || 'emanon';
}
util.inherits(BridgePlayer, EventEmitter);

BridgePlayer.prototype.send = function send(msg) {
    console.log(`${this.seat} sending`, msg);
    this.table.write(msg + '\r\n');
};

BridgePlayer.prototype.connect = function connect(table) {
    var self = this;
    this.table = table;
    this.table
        .pipe(tms())
        .on('end', () => self.emit('end'))
        .on('error', e => self.emit('error', e))
        .on('data', m => console.log(`${this.seat} received`, m))
        .on('data', m => self.emit('message', m));
    this.send(`connecting "${this.teamName}" as ${this.seat.name} using protocol version 18`);
};

module.exports = BridgePlayer;
