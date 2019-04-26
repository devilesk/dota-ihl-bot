require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
global.nockBack = require('nock').back;

global.nockBack.fixtures = 'test/fixtures/';
global.nockBack.setMode(process.env.NOCK_BACK_MODE || 'dryrun');
