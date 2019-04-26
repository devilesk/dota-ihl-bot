require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
global.spawn = require('../lib/util/spawn');
global.Promise = require('bluebird');
global.sequelize_fixtures = require('sequelize-fixtures');
global.db = require('../models');

const checkEnvironmentVariables = require('../lib/util/checkEnvironmentVariables');

checkEnvironmentVariables([
    'DB_NAME',
    'DB_USERNAME',
    'DB_PASSWORD',
]);

before(async function () {
    this.timeout(30000);
    db.init();
    await spawn('npm', ['run', 'db:init'], { shell: true });
});

afterEach(async () => {
    await db.truncate();
});

after(async () => {
    await db.close();
});
