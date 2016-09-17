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
    this.game = new bridge.Game();
    this.state = 'uninitialised';
}
util.inherits(BridgePlayer, EventEmitter);

BridgePlayer.prototype.send = function send(msg) {
    this.table.write(msg + '\r\n');
    this.emit('sent', msg);
};

BridgePlayer.prototype.bid = function bid(bid) {
    if (typeof bid === 'string') {
        bid = bridge.bid[bid];
    }

    var msg = `${this.seat.name} `;
    if (bid.isPass) {
        msg += 'passes';
    } else if (bid.isDouble) {
        msg += 'doubles';
    } else if (bid.isRedouble) {
        msg += 'redoubles';
    } else {
        msg += 'bids ' + bid.toString();
    }
    this.send(msg);

    this.onBid(bid);
};

/**
 * A known hand has cards.
 */
BridgePlayer.prototype.onCards = function onCards(msg) {
    this.board.hands[seat[msg.seat]].cards = msg.cards.map(c => card[c]);
};

BridgePlayer.prototype.onBid = function onBid(bid) {
    let auction = this.game.auction;
    auction.bid(bid);

    if (auction.isClosed()) {
        this.state = 'playing';
        this.game.contract = auction.contract();
        console.log('contract', this.game.contract.toString());
    } else if (auction.nextSeatToBid() === this.seat) {
        this.emit('make-bid', this);
    } else {
        this.send(`${this.seat.name} ready for ${auction.nextSeatToBid().name}'s bid`);
    }
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
            this.game = new bridge.Game();
            this.send(`${this.seat.name} ready for deal`);
        })
        .on('deal', m => {
            this.board.number = m.board;
            this.board.dealer = seat[m.dealer];
            this.board.vulnerability = m.vulnerable;
            this.game.auction.dealer = this.board.dealer;
            this.send(`${this.seat.name} ready for cards`);
        })
        .on('cards', m => {
            this.onCards(m);
            this.state = 'bidding';
            if (this.board.dealer === this.seat) {
                this.emit('make-bid', this);
            } else {
                this.send(`${this.seat.name} ready for ${this.board.dealer.name}'s bid`);
            }
        })

        // Bidding
        .on('bid', m => this.onBid(m.bid))

        // Playing
    ;
    this.state = 'connecting';
    this.send(`connecting "${this.teamName}" as ${this.seat.name} using protocol version 18`);
};

module.exports = BridgePlayer;
