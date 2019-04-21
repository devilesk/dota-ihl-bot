const Long = require('long');

const equalsLong = (a, b) => Long.fromValue(a || 0).equals(Long.fromValue(b || 0));

module.exports = equalsLong;
