require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
const logger = require('./lib/logger');
const checkEnvironmentVariables = require('./lib/util/checkEnvironmentVariables');
const CommandDispatcher = require('discord.js-commando/src/dispatcher');

if (process.env.NODE_ENV !== 'production') {
    // monkey patch shouldHandleMessage to handle other bot messages for testing
    CommandDispatcher.prototype.shouldHandleMessage = function shouldHandleMessage(message, oldMessage) {
        // Ignore partial messages
        if (message.partial) return false;

        if (message.author.id === this.client.user.id) return false;

        // Ignore messages from users that the bot is already waiting for input from
        if (this._awaiting.has(message.author.id + message.channel.id)) return false;

        // Make sure the edit actually changed the message content
        if (oldMessage && message.content === oldMessage.content) return false;

        return true;
    };
}

checkEnvironmentVariables([
    'DB_NAME',
    'DB_USERNAME',
    'DB_PASSWORD',
    'STEAM_API_KEY',
    'TOKEN',
    'OWNER_DISCORD_ID',
]);

const IHLManager = require('./lib/ihlManager');

const ihlManager = new IHLManager.IHLManager(process.env);
const client = IHLManager.createClient(process.env);
ihlManager.init(client);

process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received. Shutting down...');
    process.exit(0);
});
