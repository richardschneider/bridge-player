'use strict';

let tms = require('table-master-stream'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    bridge = require('bridge.js'),
    seat = bridge.seat,
    card = bridge.card;

function BridgePlayer(opts) {
    opts = opts || {};
    this.seat = opts.seat || seat.south;
    this.teamName = opts.teamName || 'emanon';
    this.board = new bridge.Board();
    this.auction = new bridge.Auction();
    this.state = 'uninitialised';
}
util.inherits(BridgePlayer, EventEmitter);

BridgePlayer.prototype.send = function send(msg) {
    this.table.write(msg + '\r\n');
    this.emit('sent', msg);
};

/**
 * A known hand has cards.
 */
BridgePlayer.prototype.onCards = function onCards(msg) {
    this.board.hands[seat[msg.seat]].cards = msg.cards.map(c => card[c]);
};

/**
 * Connect to the table and start processing any messages.
 */
BridgePlayer.prototype.connect = function connect(table) {
    var self = this;
    this.table = table;
    this.table
        .pipe(tms())
        .on('end', () => self.emit('end'))
        .on('error', e => self.emit('error', e))
        .on('data', m => self.emit('message', m))

        // Connecting
        .on('seated', () => this.send(`${this.seat.name} ready for teams`))
        .on('teams', () => this.send(`${this.seat.name} ready to start`))

        // Dealing
        .on('startOfBoard', () => {
            this.state = 'dealing';
            this.board = new bridge.Board();
            this.auction = new bridge.Auction();
            this.send(`${this.seat.name} ready for deal`);
        })
        .on('deal', m => {
            this.board.number = m.board;
            this.board.dealer = seat[m.dealer];
            this.board.vulnerability = m.vulnerable;
            this.send(`${this.seat.name} ready for cards`);
        })
        .on('cards', m => {
            this.onCards(m);
        })
    ;
    this.state = 'connecting';
    this.send(`connecting "${this.teamName}" as ${this.seat.name} using protocol version 18`);
};

module.exports = BridgePlayer;
