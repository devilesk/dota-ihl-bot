require('../common');
const convertor = require('steam-id-convertor');

describe('convertor', () => {
    it('return strings', () => {
        const accountId = convertor.to32('76561198015512690');
        const steamId64 = convertor.to64('55246962');
        assert.isString(accountId);
        assert.isString(steamId64);
        assert.strictEqual(accountId, '55246962');
        assert.strictEqual(steamId64, '76561198015512690');
    });
});
