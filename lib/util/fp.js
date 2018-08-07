const util = require('util');
const Promise = require('bluebird');
const logger = require('../logger');

const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

const pipeP = (...fns) => x => fns.reduce((v, f) => Promise.resolve(v).then(f), x);

const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);

const composeP = (...fns) => x => fns.reduceRight((v, f) => Promise.resolve(v).then(f), x);

const mapPromise = fn => async list => Promise.map(list, fn);

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
}

const tapP = fn => async (x) => {
    await fn(x);
    return x;
}

const prop = property => obj => obj[property];

const callProp = property => obj => obj[property]();

const callPropP = property => async obj => obj[property]();

module.exports = {
    pipe,
    pipeP,
    compose,
    composeP,
    mapPromise,
    reducePromise,
    trace,
    constant,
    constantP,
    tap,
    tapP,
    prop,
    callProp,
    callPropP,
};
