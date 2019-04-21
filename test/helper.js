const Promise = require('bluebird');
const SnowflakeUtil = require('discord.js/src/util/Snowflake');
const { hri } = require('human-readable-ids');
const Long = require('long');
const getRandomInt = require('../lib/util/getRandomInt');

const randomNumber = max => getRandomInt(max);

const randomMatchId = () => {
    const min = 2962528009;
    const max = 4662600666;
    return Math.floor(Math.random() * (max - min)) + min;
};

const randomNumberString = max => getRandomInt(max || 100000000).toString();

const randomLong = () => Long.fromString(randomNumberString(), true);

const randomSteamID64 = max => getRandomInt(max || 100000000).toString();

const randomSnowflake = () => SnowflakeUtil.generate();

const randomName = () => hri.random();

const waitForEvent = emitter => async event => new Promise((resolve, reject) => {
    emitter.once(event, resolve);
});

module.exports = {
    randomNumber,
    randomMatchId,
    randomNumberString,
    randomLong,
    randomSteamID64,
    randomSnowflake,
    randomName,
    waitForEvent,
};
