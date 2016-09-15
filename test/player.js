'use strict';

require('should');

let Player = require('..'),
    testTable = require('./table'),
    bridge = require('bridge.js'),
    seat = bridge.seat;


describe('Bridge Player', () => {

    it('should be seated', () => {
        let player = new Player();
        player.should.have.property('seat', seat.south);

        player = new Player({seat: seat.north});
        player.should.have.property('seat', seat.north);
    });

    it('should be a team member', () => {
        let player = new Player();
        player.should.have.property('teamName', 'emanon');

        player = new Player({ teamName: 'Blue Team' });
        player.should.have.property('teamName', 'Blue Team');
    });

    it('should exchange messages with the table', done => {
        testTable(table => {
            new Player()
                .on('end', () => done())
                .on('error', done)
                .connect(table);
            table.end();
        });
     });

});
