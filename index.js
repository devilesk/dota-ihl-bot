const dotenv = require('dotenv').config();
const client = require('./lib/client');

client.login(process.env.TOKEN);
