/*
 * Imports inhouse users from a json or tsv file.
 *
 * Usage:
 * node scripts/importMembers.js <inputFile> <guildId> (vouched)
 *
 * inputFile - path to a json file containing a JSON array of objects 
 *             of discord user info with format:
 *    {
 *       "steamId64": "12345678987654",
 *       "discordId": "123456789876543210",
 *       "nickname": "discord nickname",
 *       "username": "discord username",
 *       "discriminator": "1234"
 *    }
 * or a tsv file with first row containing the following column headers:
 * steamId64    discordId    nickname    username    discriminator
 *
 * guildId - The Discord server ID to import the users into.
 * vouched - boolean (optional) Set imported users as vouched. Default: true
 */

require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const logger = require('../lib/logger');
const { initLeague, registerUser } = require('../lib/ihl');
const Db = require('../lib/db');

const run = async (inputFile, guildId, vouched = true) => {
    logger.info(guildId);
    const league = await Db.findLeague(guildId);
    if (!league) {
        logger.error(`Invalid guildId: ${guildId}`);
        process.exit(1);
    }
    
    let countAdded = 0;
    let countFailed = 0;
    const rawData = fs.readFileSync(inputFile, 'utf8');
    let header;
    let data;
    try {
        data = JSON.parse(rawData);
    }
    catch (e) {
        if (e.name === 'SyntaxError') {
            let [ headerRow, ...tsvData ] = rawData.split('\n').map(row => row.split('\t'));
            if (headerRow.indexOf('steamId64') === -1) throw new Error('Missing steamId64 column.');
            if (headerRow.indexOf('discordId') === -1) throw new Error('Missing discordId column.');
            data = tsvData.map(row => row.reduce((obj, col, index) => {
                obj[headerRow[index]] = col;
                return obj;
            }, {}));
        }
        else {
            throw (e);
        }
    }
    logger.info(`${inputFile} loaded. ${data.length} entries.`);
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        logger.info(`Registering steamId64: ${row.steamId64}, discordId: ${row.discordId}, nickname: ${row.nickname || row.username}`);
        try {
            const user = await registerUser(guildId, row.steamId64, row.discordId);
            await user.update({ nickname: row.nickname || row.username, vouched: !!vouched });
            countAdded += 1;
            logger.info(`${i + 1}/${data.length}. Added. rankTier: ${user.rankTier}.`);
        }
        catch (e) {
            countFailed += 1;
            logger.error(e);
        }
        // Delay for opendota rate limit.
        await Promise.delay(1100);
    }
    logger.info(`Finished. Added: ${countAdded}. Failed: ${countFailed}. Total: ${data.length}.`);
    process.exit(0);
}

process.on('unhandledRejection', () => process.exit(1));

run(process.argv[2], process.argv[3], process.argv[4]);