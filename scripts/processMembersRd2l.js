/*
 * Consolidates discord member info from the RD2L discord
 * with steam ids from the RD2L website.
 *
 * Usage:
 * node scripts/processMembersRd2l.js <inputFile> <outputFile> (format)
 *
 * inputFile - path to a file containing a JSON array of objects
 *             of discord user info with format:
 *    {
 *       "discordId": "123456789876543210",
 *       "nickname": "discord nickname",
 *       "username": "discord username",
 *       "discriminator": "1234"
 *    }
 * outputFile - path to file to write
 * format - (optional) Valid output formats: json, tsv. Default: json
 */

const got = require('got');
const convertor = require('steam-id-convertor');
const fs = require('fs');
const logger = require('../lib/logger');

const run = async (inputFile, outputFile, format = 'json') => {
    const discordMembers = JSON.parse(fs.readFileSync(inputFile));
    logger.info(`${inputFile} loaded ${discordMembers.length} entries.`);

    const response = await got('https://rd2l.gg/players/json', { json: true });
    const rd2lMembers = response.body;
    logger.info(`rd2l.gg/players/json loaded ${rd2lMembers.length} entries.`);

    const rd2lMembersWithDiscord = rd2lMembers.filter(rd2lMember => rd2lMember.discord_name);
    logger.info(`rd2l.gg/players/json ${rd2lMembersWithDiscord.length} entries with discord_name.`);

    const members = {};

    logger.info('Matching members by discord name...');
    for (const discordMember of discordMembers) {
        for (const rd2lMember of rd2lMembersWithDiscord) {
            let addMember = false;
            if ((`${discordMember.username}#${discordMember.discriminator}` === rd2lMember.discord_name)
                || (`${discordMember.nickname}#${discordMember.discriminator}` === rd2lMember.discord_name)) {
                addMember = true;
            }
            else {
                const [rd2lDiscordName, rd2lDiscordDiscriminator] = rd2lMember.discord_name.split('#');
                const cleanedRd2lDiscordName = rd2lDiscordName.replace(/\s+/g, '').toLowerCase();
                const cleanedDiscordUsername = discordMember.username.replace(/\s+/g, '').toLowerCase();
                const cleanedDiscordNickname = discordMember.nickname.replace(/\s+/g, '').toLowerCase();
                if (rd2lDiscordDiscriminator === discordMember.discriminator
                    && (cleanedRd2lDiscordName === cleanedDiscordUsername
                     || cleanedRd2lDiscordName === cleanedDiscordNickname)) {
                    addMember = true;
                }
            }
            if (addMember) {
                members[discordMember.discordId] = members[discordMember.discordId] || [];
                const steamId64 = convertor.to64(rd2lMember.steam_id);
                const duplicateMember = members[discordMember.discordId].find(member => member.steamId64 === steamId64);
                if (!duplicateMember) {
                    members[discordMember.discordId].push({
                        discordId: discordMember.discordId,
                        nickname: discordMember.nickname,
                        username: discordMember.username,
                        discriminator: discordMember.discriminator,
                        steamId64,
                    });
                }
            }
        }
    }

    logger.info(`${Object.keys(members).length} matching members.`);

    const data = [];

    for (const [, foundMembers] of Object.entries(members)) {
        if (foundMembers.length === 1) {
            data.push(foundMembers[0]);
        }
    }

    logger.info(`${data.length} 1 to 1 matching members.`);

    let output = '';
    if (format === 'json') {
        output = JSON.stringify(data);
    }
    else {
        output += 'steamId64\tdiscordId\tnickname\tusername\tdiscriminator\n';
        output += data.map(row => `${row.steamId64}\t${row.discordId}\t${row.nickname}\t${row.username}\t${row.discriminator}`).join('\n');
    }

    fs.writeFile(outputFile, output, 'utf8', (err) => {
        if (err) {
            logger.error(err);
        }
        logger.info(`Ouput to ${outputFile}.`);
    });
};

run(process.argv[2], process.argv[3], process.argv[4]);
