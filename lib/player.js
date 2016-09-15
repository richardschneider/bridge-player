'use strict';

let bridge = require('bridge.js'),
    seat = bridge.seat;

function BridgePlayer(opts) {
    opts = opts || {};
    this.seat = opts.seat || seat.south;
    this.teamName = opts.teamName || 'emanon';
}

BridgePlayer.prototype.connect = function connect(table) {
    this.table = table;
};

module.exports = BridgePlayer;
