#! /usr/bin/env node

'use strict';

var program = require('commander');
var bridge = require('bridge.js');
var Player = require('../index');
var net = require('net');
var process = require('process');

program
    .usage('[options]')
    .description('A robot that plays bridge')
    .option('-d, --debug', 'show the table messages')
    .option('-i, --ignore', 'ignore errors and keep on playing')
    .option('-n, --number [#]', 'number of bots to make')
    .option('-s, --seat [seat]', 'the seat to play, defaults to north')
    .option('-t, --team [name]', 'team name')
    .option('-p, --port [number]', 'defaults to 2000')
    .option('-h, --host [name]', 'defaults to localhost')
    ;

program.parse(process.argv);

let seat = bridge.seat[program.seat || 'south'],
    team = program.team,
    botCount = parseInt(program.number) || 1,
    port = parseInt(program.port) || 2000,
    host = program.host || 'localhost';

function makeBot(seat) {
    let me = new Player({
        seat: seat,
        teamName: team
    }),
    table = net.connect(port, host);

    me.on('error', e => {
        console.error(e);
        if (!program.ignore)
            process.exit(1);
    });

    if (program.debug) {
        me
            .on('sent', m => console.log(me.seat.symbol, 'sent:', m))
            .on('message', m => console.log(me.seat.symbol, 'rcvd:', m));
    }
    me.on('make-bid', player => {
        var bid = player.game.auction.bids.length === 0 ? '1C' : 'pass';
        player.bid(bid);
    });
    me.on('make-lead', player => {
        var card = player.cards()[0];
        player.play(card);
    });
    me.connect(table);
    return me;
}

console.log('making', botCount, 'bots');
for (let n = 0; n < botCount; ++n) {
    makeBot(seat);
    seat = seat.next;
}
