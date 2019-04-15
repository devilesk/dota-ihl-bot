const dotenv = require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
const chai = require('chai');
const assert = chai.assert;
const convertor = require('steam-id-convertor');

describe('convertor', () => {
    it('return strings', () => {
        const account_id = convertor.to32('76561198015512690');
        const steamid_64 = convertor.to64('55246962');
        assert.isString(account_id);
        assert.isString(steamid_64);
        assert.strictEqual(account_id, '55246962');
        assert.strictEqual(steamid_64, '76561198015512690');
    });
});