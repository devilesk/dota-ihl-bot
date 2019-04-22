const Long = require('long');

/**
 * @memberof module:util
 */
const equalsLong = (a, b) => Long.fromValue(a || 0).equals(Long.fromValue(b || 0));

module.exports = equalsLong;
