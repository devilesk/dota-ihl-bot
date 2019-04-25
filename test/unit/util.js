require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
const chai = require('chai');
const sinon = require('sinon');

const { assert } = chai;
const util = require('../../lib/util');
const Fp = require('../../lib/util/fp');
const logger = require('../../lib/logger');

describe('capitalize', () => {
    it('return empty string when not a string', () => {
        const result = util.capitalize({});
        assert.strictEqual(result, '');
    });
    it('return capitalized string', () => {
        const result = util.capitalize('hello world!');
        assert.strictEqual(result, 'Hello world!');
    });
});

describe('checkEnvironmentVariables', () => {
    it('return undefined when no missing required variables', () => {
        const result = util.checkEnvironmentVariables(['HOME']);
        assert.isUndefined();
    });
    it('return undefined when no required variables', () => {
        const result = util.checkEnvironmentVariables([]);
        assert.isUndefined();
    });
    it('throw when missing required variables', () => {
        assert.throws(() => util.checkEnvironmentVariables(['SDFUEIRWR']), 'Required ENV variables are not set: [SDFUEIRWR]');
    });
});

describe('convertVanity', () => {
    it('return null on request error', async () => {
        const result = await util.convertVanity('');
        assert.isNull(result);
    });
});

describe('equalsLong', () => {
    it('return true when a is null and b is null', async () => {
        const result = await util.equalsLong(null, null);
        assert.isTrue(result);
    });
    it('return true when a is null and b is 0', async () => {
        const result = await util.equalsLong(null, 0);
        assert.isTrue(result);
    });
    it('return true when a is 0 and b is null', async () => {
        const result = await util.equalsLong(0, null);
        assert.isTrue(result);
    });
    it('return true when a is 0 and b is 0', async () => {
        const result = await util.equalsLong(0, 0);
        assert.isTrue(result);
    });
});

describe('Fp', () => {
    describe('trace', () => {
        it('return called once with test: true', async () => {
            const spy = sinon.spy(logger, 'debug');
            const result = Fp.trace('test')(true);
            assert.isTrue(spy.withArgs('test: true').calledOnce);
            assert.isTrue(result);
        });
    });
    describe('tap', () => {
        it('return called once with true', async () => {
            const spy = sinon.spy();
            const result = Fp.tap(spy)(true);
            assert.isTrue(spy.withArgs(true).calledOnce);
            assert.isTrue(result);
        });
    });
    describe('tryCallP', () => {
        it('return null and call logger.error', async () => {
            const spy = sinon.spy(logger, 'error');
            const stub = sinon.stub();
            const e = new Error('err');
            stub.throws(e);
            const result = await Fp.tryCallP(stub)(true);
            assert.isTrue(stub.withArgs(true).calledOnce);
            assert.isTrue(spy.withArgs(e).calledOnce);
            assert.isNull(result);
        });
    });
});

describe('getSteamProfile', () => {
    it('return undefined on empty request', async () => {
        const result = await util.getSteamProfile();
        assert.isUndefined(result);
    });
});

describe('toHHMMSS', () => {
    it('return 01:59:11 when given 7151 seconds', async () => {
        assert.equal(util.toHHMMSS(7151), '01:59:11');
    });
});

describe('rankTierToMedalName', () => {
    const tests = [
        { args: -1, expected: 'Unknown' },
        { args: 90, expected: 'Unknown' },
        { args: 0, expected: 'Uncalibrated' },
        { args: null, expected: 'Uncalibrated' },
        { args: undefined, expected: 'Uncalibrated' },
        { args: 9, expected: 'Uncalibrated' },
        { args: 10, expected: 'Herald' },
        { args: 19, expected: 'Herald 9' },
        { args: 20, expected: 'Guardian' },
        { args: 29, expected: 'Guardian 9' },
        { args: 30, expected: 'Crusader' },
        { args: 39, expected: 'Crusader 9' },
        { args: 40, expected: 'Archon' },
        { args: 49, expected: 'Archon 9' },
        { args: 50, expected: 'Legend' },
        { args: 59, expected: 'Legend 9' },
        { args: 60, expected: 'Ancient' },
        { args: 69, expected: 'Ancient 9' },
        { args: 70, expected: 'Divine' },
        { args: 79, expected: 'Divine 9' },
        { args: 80, expected: 'Immortal' },
        { args: 89, expected: 'Immortal' },
    ];
    tests.forEach((test) => {
        it(`return ${test.expected} when rankTier ${test.args}`, async () => {
            assert.equal(util.rankTier.rankTierToMedalName(test.args), test.expected);
        });
    });
});

describe('parseRankTier', () => {
    const tests = [
        { args: '-1', expected: null },
        { args: '-', expected: null },
        { args: '', expected: null },
        { args: ' ', expected: null },
        { args: 'notarank 1', expected: null },
        { args: 'u 10', expected: null },
        { args: 'u 0', expected: 0 },
        { args: 'u 9', expected: 0 },
        { args: 'a 0', expected: null },
        { args: 'a 9', expected: null },
        { args: 'an 9', expected: 69 },
        { args: 'i 0', expected: 80 },
        { args: 'i 9', expected: 80 },
        { args: 'i 100', expected: 80 },
        { args: 'i', expected: 80 },
        { args: 'u', expected: 0 },
        { args: 'h', expected: 10 },
        { args: 'a', expected: null },
        { args: 'an', expected: 60 },
        { args: 'ar', expected: 40 },
        { args: 'Immortal', expected: 80 },
        { args: 'Ancient', expected: 60 },
        { args: 'Ancient 5', expected: 65 },
        { args: 'Archon', expected: 40 },
        { args: 'Archon 5', expected: 45 },
        { args: '65', expected: 65 },
        { args: '80', expected: 80 },
        { args: '81', expected: 80 },
        { args: '0', expected: 0 },
        { args: '10', expected: 10 },
    ];
    tests.forEach((test) => {
        it(`return ${test.expected} when text ${test.text}`, async () => {
            assert.equal(util.rankTier.parseRankTier(test.args), test.expected);
        });
    });
});
