/**
 * @module client
 */
 
 /**
 * Discord.js Commando Command object
 * @external Command
 * @see {@link https://discord.js.org/#/docs/commando/v0.9.0/class/Command}
 */
 
const Commando = require('discord.js-commando');
const path = require('path');
const logger = require('./logger');
const dotenv = require('dotenv').config();
const { ihlManager } = require('./ihlManager');
const CONSTANTS = require('./constants');

const client = new Commando.CommandoClient({
    commandPrefix: process.env.COMMAND_PREFIX,
    owner: process.env.OWNER_DISCORD_ID,
    disableEveryone: true,
    commandEditableDuration: 0,
    unknownCommandResponse: false,
});

client.registry
    .registerDefaultTypes()
    .registerGroups([
        ['ihl', 'Inhouse League General Commands'],
        ['queue', 'Inhouse League Queue Commands'],
        ['challenge', 'Inhouse League Challenge Commands'],
        ['admin', 'Inhouse League Admin Commands'],
    ])
    .registerDefaultGroups()
    .registerDefaultCommands()
    .registerCommandsIn(path.join(__dirname, '../commands'));

client.on('ready', () => {
    logger.debug(`Logged in as ${client.user.tag}`);
    ihlManager.init(client);
});

client.on('message', (msg) => {
    if (msg.author.id !== client.user.id) {
        ihlManager.eventEmitter.emit(CONSTANTS.EVENT_DISCORD_MESSAGE, msg);
    }
});

client.on('guildMemberRemove', async (member) => {
    const user = await findUserByDiscordId(member.guild.id)(member.id);
    if (user) {
        ihlManager.eventEmitter.emit(CONSTANTS.EVENT_USER_LEFT_GUILD, user);
    }
});

module.exports = client;
