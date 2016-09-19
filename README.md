# Bridge Player

[![Travis build status](https://travis-ci.org/richardschneider/bridge-player.svg)](https://travis-ci.org/richardschneider/bridge-player)
[![Coverage Status](https://coveralls.io/repos/github/richardschneider/bridge-player/badge.svg?branch=master)](https://coveralls.io/github/richardschneider/bridge-player?branch=master)
 [![npm version](https://badge.fury.io/js/bridge-player.svg)](https://badge.fury.io/js/bridge-player) 
 
A **bridge-player** allows a human or robot to play electronic bridge using the [Blue Chip Bridge Table Manager Protocol](http://www.bluechipbridge.co.uk/protocol.htm). It processses/generates the protocol messages and only asks the palyer to make a bid or
play a card.

The [change log](https://github.com/richardschneider/bridge-player/releases) is automatically produced with
the help of [semantic-release](https://github.com/semantic-release/semantic-release).

## Getting started

Install the latest version with [npm](http://blog.npmjs.org/post/85484771375/how-to-install-npm)

    > npm install bridge.js bridge-player --save

## Usage

Include the packages

    let Player = require('bridge-player'),
        seat = require('bridge.js').seat;

Create a player

    let me = new Player({
        seat: seat.south,
        teamName: 'Red Team'
    });
    
    // The human or robot MUST respond to these events
    me
        .on('make-bid', player => player.bid(...))
        .on('make-play', player => player.play(...))
        .on('make-dummy-play', player => player.playFromDummy(...));

Connect the player to a table manager

    me.connect(table);
    
# License
The [MIT license](LICENSE).

Copyright © 2016 Richard Schneider [(makaretu@gmail.com)](mailto:makaretu@gmail.com?subject=table+master+stream)