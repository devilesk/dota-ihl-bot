const dotenv = require('dotenv').config();
const client = require('./client');

client.login(process.env.TOKEN);
