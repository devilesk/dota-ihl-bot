const util = require('util');
const Promise = require('bluebird');
const logger = require('../logger');

const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

const pipeP = (...fns) => x => fns.reduce((v, f) => Promise.resolve(v).then(f), x);

const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);

const composeP = (...fns) => x => fns.reduceRight((v, f) => Promise.resolve(v).then(f), x);

const mapPromise = fn => async list => Promise.map(list, fn);

const filterPromise = fn => async list => Promise.filter(list, fn);

const allPromise = async list => Promise.all(list);

const reducePromise = fn => initialValue => async list => Promise.reduce(list, fn, initialValue);

const trace = label => (value) => {
    logger.debug(`${label}: ${util.inspect(value)}`);
    return value;
};

const constant = x => () => x;

const constantP = x => async () => Promise.resolve(x);

const tap = fn => (x) => {
    fn(x);
    return x;
};

const tapP = fn => async (x) => {
    await fn(x);
    return x;
};

const negateP = fn => async x => !(await fn(x));

const prop = property => obj => obj[property];

const callProp = property => obj => obj[property]();

const callPropP = property => async obj => obj[property]();

const tryCallP = fn => async (x) => {
    try {
        return await fn(x);
    }
    catch (e) {
        logger.log({ level: 'error', message: e });
        return null;
    }
};

const tryMapPromise = fn => async (list) => {
    const result = await mapPromise(tryCallP(fn))(list);
    return result.filter(x => x);
};

module.exports = {
    pipe,
    pipeP,
    compose,
    composeP,
    mapPromise,
    filterPromise,
    allPromise,
    reducePromise,
    trace,
    constant,
    constantP,
    tap,
    tapP,
    negateP,
    prop,
    callProp,
    callPropP,
    tryCallP,
    tryMapPromise,
};
