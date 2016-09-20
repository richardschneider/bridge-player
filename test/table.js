'use strict';

let stream = require('stream'),
    util = require('util');

/*
 * A simple table that always sends 'end of sesssion' and closes.
 */
function TestTable() {
    stream.Transform.call(this);
}
util.inherits(TestTable, stream.Transform);

TestTable.prototype._transform = function() {
    this.push('end of session\r\n');
    this.push(null);
};

module.exports = TestTable;
