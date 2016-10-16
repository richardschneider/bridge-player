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
    this.board = new bridge.Board();
    this.game = new bridge.Game();
    this.cards = [];
    this.dummyCards = [];
    this.trickNumber = 1;
    this.state = 'uninitialised';
}
util.inherits(BridgePlayer, EventEmitter);

BridgePlayer.prototype.send = function send(msg) {
    this.table.write(msg + '\r\n');
    this.emit('sent', msg);
};

/**
 * The player makes a bid.
 */
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
 * The player plays a card.
 */
BridgePlayer.prototype.play = function play(card) {
    if (typeof card === 'string') {
        card = bridge.card[card];
    }

    if (!this.cards.some(c => c === card)) {
        throw new Error('You cannot play ' + card.toString());
    }

    let seat = this.seat;
    this.send(`${seat.name} plays ${card.toString()}`);
    this.onPlay(seat, card);
};

/**
 * The declaror plays a card from the dummy's hand.
 */
BridgePlayer.prototype.playFromDummy = function play(card) {
    if (typeof card === 'string') {
        card = bridge.card[card];
    }

    if (!this.dummyCards.some(c => c === card)) {
        throw new Error('Dummy cannot play ' + card.toString());
    }

    let seat = this.game.contract.dummy();
    this.send(`${seat.name} plays ${card.toString()}`);
    this.onPlay(seat, card);
};

/**
 * A known hand has cards.
 */
BridgePlayer.prototype.cards = function cards() {
    return this.board.hands[this.seat].cards;
};

BridgePlayer.prototype.onCards = function onCards(msg) {
    let seat = bridge.seat[msg.seat];
    let dummy = this.game.contract.dummy();
    msg.cards
        .map(c => bridge.card[c])
        .forEach(c => {

            this.board.hands[seat].cards.push(c);
            if (seat === this.seat) {
                this.cards.push(c);
            } else if (seat === dummy) {
                this.dummyCards.push(c);
            }
        })
    ;
};

BridgePlayer.prototype.onBid = function onBid(bid) {
    let auction = this.game.auction;
    auction.bid(bid);

    if (auction.isClosed()) {
        let contract = auction.contract();
        this.game.contract = contract;
        if (contract.leader() === this.seat) {
            // do nothing, will get a lead message.
        } else if (contract.dummy() === this.seat) {
            this.send(`${this.seat.name} ready for dummy's card to trick 1`);
        } else {
            this.send(`${this.seat.name} ready for dummy`);
        }
        this.state = 'playing';
    } else if (auction.nextSeatToBid() === this.seat) {
        this.emit('make-bid', this);
    } else {
        this.send(`${this.seat.name} ready for ${auction.nextSeatToBid().name}'s bid`);
    }
};

/**
 * Called when any player plays a card.
 */
BridgePlayer.prototype.onPlay = function onPlay(seat, card) {

    // If opening lead, then we ask for the dummy.
    if (this.game.tricks.length === 0 && this.game.contract.leader() === this.seat) {
        this.send(`${this.seat.name} ready for dummy`);
    }

    // Add the card to played tricks.
    var next = this.game.play(card);
    var trick = this.game.tricks[this.game.tricks.length - 1];
    var winner = trick.winner(this.game.contract);

    // Remove the card from our state.
    this.cards = this.cards.filter(c => c !== card);
    this.dummyCards = this.dummyCards.filter(c => c !== card);

    // If we have a winner, then we have a new trick.
    if (winner) {
        ++this.trickNumber;
    }

    // Add end of game?
    if (this.trickNumber === 14) {
        return;
    }

    // Dummy is quiet.
    if (this.seat === this.game.contract.dummy()) {
        this.send(`${this.seat.name} ready for dummy's card to trick ${this.trickNumber}`);
        return;
    }

    // If we (or dummy) are winner then wait for a 'lead' message.
    if (winner === this.seat || (this.game.contract.declaror === this.seat && winner === this.game.contract.dummy())) {
        return;
    }

    // Is it our turn to play?
    if (next === this.seat) {
        this.emit('make-play', this);
    } else if (this.game.contract.declaror === this.seat && next === this.game.contract.dummy()) {
        this.emit('make-dummy-play', this);

    // Get the card from the next player
    } else {
        this.send(`${this.seat.name} ready for ${next}'s card to trick ${this.trickNumber}`);
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
            this.cards = [];
            this.dummyCards = [];
            this.trickNumber = 1;
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
        .on('lead', () => this.emit('make-play', this))
        .on('dummyLead', () => this.emit('make-dummy-play', this))
        .on('play', m => this.onPlay(bridge.seat[m.seat], bridge.card[m.card]))
        .on('dummyCards', m => {
            var dummy = this.game.contract.dummy();
            m.seat = dummy;
            this.onCards(m);
            this.send(`${this.seat.name} received dummy`);
            if (dummy !== this.seat && this.game.contract.leader() !== this.seat) {
                this.send(`${this.seat.name} ready for ${this.game.contract.leader()}'s card to trick 1`);
            }
        })

        // Misc.
        .on('endOfSession', () => this.state = 'done')
        .on('data', m => self.emit('message-processed', m))
    ;
    this.state = 'connecting';
    this.send(`connecting "${this.teamName}" as ${this.seat.name} using protocol version 18`);

    return this;
};

module.exports = BridgePlayer;
