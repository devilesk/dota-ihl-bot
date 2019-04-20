const dotenv = require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
global.spawn = require('../lib/util/spawn');
global.Promise = require('bluebird');
global.chai = require('chai');
global.assert = chai.assert;
global.expect = chai.expect;
global.sinon = require('sinon');
global.path = require('path');
global.sequelize_fixtures = require('sequelize-fixtures');
global.db = require('../models');
global.CONSTANTS = require('../lib/constants');
global.Mocks = require('./mocks');
global.TestHelper = require('./helper');
global.chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const checkEnvironmentVariables = require('../lib/util/checkEnvironmentVariables');

checkEnvironmentVariables([
    'DB_NAME',
    'DB_USERNAME',
    'DB_PASSWORD',
    'STEAM_API_KEY',
]);

async function init() {
    db.init();
    await spawn('npm', ['run', 'db:init'], { shell: true });
    run();
}

afterEach(async () => {
    await Promise.all(
        Object.values(db.sequelize.models)
            .map((model) => model.truncate({
                cascade: true,
                restartIdentity: true,
            }))
    );
});

after(async () => {
    await db.close();
});

init();