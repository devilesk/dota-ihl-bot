const { MissingEnvironmentVariable } = require('../exceptions');

/**
 * @memberof module:util
 */
const checkEnvironmentVariables = (requiredEnv) => {
    const unsetEnv = requiredEnv.filter(env => !(typeof process.env[env] !== 'undefined'));

    if (unsetEnv.length > 0) {
        throw new MissingEnvironmentVariable(`Required ENV variables are not set: [${unsetEnv.join(', ')}]`);
    }
};

module.exports = checkEnvironmentVariables;
