require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });

global.chai = require('chai');
global.sinon = require('sinon');
global.path = require('path');
global.CONSTANTS = require('../lib/constants');
global.logger = require('../lib/logger');
global.cache = require('../lib/cache');
global.Mocks = require('./mocks');
global.TestHelper = require('./helper');
global.chaiAsPromised = require('chai-as-promised');

global.assert = global.chai.assert;
global.expect = global.chai.expect;
global.chai.use(global.chaiAsPromised);

const checkEnvironmentVariables = require('../lib/util/checkEnvironmentVariables');

checkEnvironmentVariables([
    'STEAM_API_KEY',
]);

before(async () => {
    await cache.connect();
});


after(async () => {
    await cache.disconnect();
});
