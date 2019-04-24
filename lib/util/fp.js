/**
 * @module fp
 * @description Functional programming utility functions.
 */

const util = require('util');
const Promise = require('bluebird');
const logger = require('../logger');

/**
 * @memberof module:fp
 */
const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

/**
 * @memberof module:fp
 */
const pipeP = (...fns) => x => fns.reduce((v, f) => Promise.resolve(v).then(f), x);

/**
 * @memberof module:fp
 */
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);

/**
 * @memberof module:fp
 */
const composeP = (...fns) => x => fns.reduceRight((v, f) => Promise.resolve(v).then(f), x);

/**
 * @memberof module:fp
 */
const mapPromise = fn => async list => Promise.map(list, fn);

/**
 * @memberof module:fp
 */
const filterPromise = fn => async list => Promise.filter(list, fn);

/**
 * @memberof module:fp
 */
const allPromise = async list => Promise.all(list);

/**
 * @memberof module:fp
 */
const reducePromise = fn => initialValue => async list => Promise.reduce(list, fn, initialValue);

/**
 * @memberof module:fp
 */
const trace = label => (value) => {
    logger.debug(`${label}: ${util.inspect(value)}`);
    return value;
};

/**
 * @memberof module:fp
 */
const constant = x => () => x;

/**
 * @memberof module:fp
 */
const constantP = x => async () => Promise.resolve(x);

/**
 * @memberof module:fp
 */
const tap = fn => (x) => {
    fn(x);
    return x;
};

/**
 * @memberof module:fp
 */
const tapP = fn => async (x) => {
    await fn(x);
    return x;
};

/**
 * @memberof module:fp
 */
const negateP = fn => async x => !(await fn(x));

/**
 * @memberof module:fp
 */
const prop = property => obj => obj[property];

/**
 * @memberof module:fp
 */
const callProp = property => obj => obj[property]();

/**
 * @memberof module:fp
 */
const callPropP = property => async obj => obj[property]();

/**
 * @memberof module:fp
 */
const tryCallP = fn => async (x) => {
    try {
        return await fn(x);
    }
    catch (e) {
        logger.log({ level: 'error', message: e });
        return null;
    }
};

/**
 * @memberof module:fp
 */
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
