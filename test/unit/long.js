require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
const chai = require('chai');

const { assert } = chai;
const Long = require('long');
const Dota2 = require('dota2');

describe('Long', () => {
    it('return string of digits', () => {
        const value = new Long(0xFFFFFFFF, 0x7FFFFFFF);
        assert.match(value.toString(), /^\d+$/);
        assert.match(`${value}`, /^\d+$/);
        assert.instanceOf(value, Long);
        assert.isObject(value);
    });
    it('protobuf lobby_id is Long', () => {
        const d1 = new Dota2.schema.CMsgPracticeLobbyJoin({
            lobby_id: 1,
            pass_key: '2',
        });
        const d2 = new Dota2.schema.CMsgPracticeLobbyJoin({
            lobby_id: new Long(1),
            pass_key: '2',
        });
        assert.isTrue(Long.isLong(d1.lobby_id));
        assert.isTrue(Long.isLong(d2.lobby_id));
        assert.isTrue(d1.lobby_id.equals(d2.lobby_id));
        assert.isTrue(d2.lobby_id.equals(d1.lobby_id));
    });
    it('Long equality', () => {
        assert.isTrue(Long.ZERO.equals(Long.fromString('0')));
        assert.isTrue(Long.ZERO.equals(0));
        assert.isTrue(Long.ZERO.equals('0'));
        assert.isFalse(Long.isLong('0'));
        assert.isTrue(Long.isLong(Long.fromValue('' || 0)));
        assert.isTrue(Long.isLong(Long.fromValue(0 || 0)));
        assert.isTrue(Long.isLong(Long.fromValue(null || 0)));
        assert.isTrue(Long.isLong(Long.fromValue(undefined || 0)));
        assert.isTrue(Long.isLong(Long.fromValue(Long.ZERO || 0)));
        assert.strictEqual(Long.ZERO.toString(), '0');
    });
    it('not throw', () => {
        let value;
        value = Long.fromString('asd7375f');
        assert.isTrue(Long.ZERO.equals(value));
        value = Long.fromString('asd6shbcvf');
        assert.isTrue(Long.ZERO.equals(value));
        value = Long.fromString(';&$%*#%&(*');
        assert.isTrue(Long.ZERO.equals(value));
        value = Long.fromString('""""1313');
        assert.isTrue(Long.ZERO.equals(value));
        value = Long.fromString('a123123');
        assert.isTrue(Long.ZERO.equals(value));
        value = Long.fromValue(null || '0');
        assert.isTrue(Long.ZERO.equals(value));
        value = Long.fromValue(undefined || '0');
        assert.isTrue(Long.ZERO.equals(value));

        value = Long.fromString('123123a');
        assert.isTrue(value.equals(123123));
    });
});
