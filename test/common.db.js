require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
global.spawn = require('../lib/util/spawn');
global.Promise = require('bluebird');
global.sequelize_fixtures = require('sequelize-fixtures');
global.db = require('../models');
global.cache = require('../lib/cache');

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
    cache.clear();
    await Promise.all(
        Object.values(db.sequelize.models)
            .map(model => model.truncate({
                cascade: true,
                restartIdentity: true,
            })),
    );
});

after(async () => {
    await db.close();
});
