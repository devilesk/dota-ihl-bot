require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
global.nockBack = require('nock').back;

global.nockBack.fixtures = 'test/fixtures/';
global.nockBack.setMode(process.env.NOCK_BACK_MODE || 'dryrun');

global.afterRecord = (scopes) => {
    scopes.forEach((scope) => {
        scope.path = scope.path.replace(`key=${process.env.STEAM_API_KEY}&`, '');
    });
    return scopes;
};

global.prepareScope = (scope) => {
    scope.filteringPath = path => path.replace(`key=${process.env.STEAM_API_KEY}&`, '');
};
