const Promise = require('bluebird');
const SnowflakeUtil = require('discord.js/src/util/Snowflake');
const { hri } = require('human-readable-ids');
const getRandomInt = require('../lib/util/getRandomInt');

const randomNumber = max => getRandomInt(max);

const randomNumberString = max => getRandomInt(max || 100000000).toString();

const randomSteamID64 = max => getRandomInt(max || 100000000).toString();

const randomSnowflake = () => SnowflakeUtil.generate();

const randomName = () => hri.random();

const waitForEvent = emitter => async (event) => new Promise((resolve, reject) => {
    emitter.once(event, resolve);
});

module.exports = {
    randomNumber,
    randomNumberString,
    randomSteamID64,
    randomSnowflake,
    randomName,
    waitForEvent,
}