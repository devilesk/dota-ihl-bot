require('../common.nock');
require('../common');
const util = require('../../lib/util');
const Fp = require('../../lib/util/fp');
const Promise = require('bluebird');

describe('util', () => {
    before(async () => {
        ({ nockDone } = await nockBack('unit_util.json', { before: prepareScope, afterRecord }));
    });

    after(async () => {
        await nockDone();
    });

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

    describe('partition', () => {
        it('return array with partitions of length 2', async () => {
            const result = await util.partition([1, 2, 3, 4, 5, 6, 7, 8], 2);
            result.forEach(group => assert.lengthOf(group, 2));
        });
    });

    describe('spawn', () => {
        it('reject', async () => {
            await assert.isRejected(util.spawn('asdf1234'));
        });
    });

    describe('templateString', () => {
        it('return replaced string', async () => {
            let makeMeKing = util.templateString('${name} is now the king of ${country}!');
            let result = makeMeKing({ name: 'Bryan', country: 'Scotland' });
            assert.equal(result, 'Bryan is now the king of Scotland!');
            makeMeKing = util.templateString('${name} is now the king of ${country}!');
            result = makeMeKing({ name: 'John', country: 'England' });
            assert.equal(result, 'John is now the king of England!');
        });
    });

    describe('enumerateErrorFormat', () => {
        it('return info object from message error', async () => {
            const e = new Error('test');
            const info = util.enumerateErrorFormat().transform({ message: e });
            assert.equal(e.message, info.message.message);
        });
        it('return info object from error', async () => {
            const e = new Error('test');
            const info = util.enumerateErrorFormat().transform(e);
            assert.equal(e.message, info.message);
        });
    });

    describe('queue', () => {
        it('get and set rateLimit', async () => {
            const q = new util.queue();
            assert.equal(q.rateLimit, 1);
            q.rateLimit = 2;
            assert.equal(q.rateLimit, 2);
        });

        it('get and set backoff', async () => {
            const q = new util.queue();
            assert.equal(q.backoff, 10000);
            q.backoff = 20000;
            assert.equal(q.backoff, 20000);
        });

        it('schedule job and execute', async () => {
            const spy = sinon.spy();
            const q = new util.queue();
            q.schedule(spy);
            assert.isTrue(spy.calledOnce);
        });

        it('schedule job do not execute when STATE.BLOCKED', async () => {
            const spy = sinon.spy();
            const q = new util.queue();
            q.block();
            q.schedule(spy);
            assert.isFalse(spy.calledOnce);
        });

        it('schedule job do not execute when retries > 0', async () => {
            const spy = sinon.spy();
            const q = new util.queue();
            q._retries += 1;
            q.schedule(spy);
            assert.isFalse(spy.calledOnce);
        });

        it('release', async () => {
            const q = new util.queue();
            q.block();
            assert.equal('blocked', q._state);
            const spy = sinon.spy(q, '_execute');
            q.release();
            assert.equal('idle', q._state);
            assert.isTrue(spy.calledOnce);
        });

        it('release when retries > 0', async () => {
            const q = new util.queue();
            q.block();
            assert.equal('blocked', q._state);
            q._retries += 1;
            const spy = sinon.spy(q, '_execute');
            q.release();
            assert.equal('idle', q._state);
            assert.isFalse(spy.calledOnce);
        });

        it('block then _execute with no job', async () => {
            const q = new util.queue();
            q.block();
            assert.equal('blocked', q._state);
            q._execute();
            assert.equal('idle', q._state);
            assert.equal(q._retries, 0);
        });

        it('block then _execute', async () => {
            const q = new util.queue();
            q.backoff = 0;
            q.block();
            assert.equal('blocked', q._state);
            const spy = sinon.spy();
            q._queue.push(spy);
            q._execute();
            assert.equal('blocked', q._state);
            assert.equal(q._retries, 1);
            assert.isFalse(spy.calledOnce);
            assert.lengthOf(q._queue, 1);
            q.release();
            await Promise.delay(50);
            assert.isTrue(spy.calledOnce);
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
            { args: '90', expected: null },
            { args: 'notarank 1', expected: null },
            { args: '1 notarank', expected: null },
            { args: '1 a', expected: null },
            { args: '1 an', expected: 61 },
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
});
