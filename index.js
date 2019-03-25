const CommandDispatcher = require('discord.js-commando/src/dispatcher');
// monkey patch shouldHandleMessage to handle other bot messages for testing
CommandDispatcher.prototype.shouldHandleMessage = function (message, oldMessage) {
    // Ignore partial messages
    if(message.partial) return false;

    if(message.author.id === this.client.user.id) return false;

    // Ignore messages from users that the bot is already waiting for input from
    if(this._awaiting.has(message.author.id + message.channel.id)) return false;

    // Make sure the edit actually changed the message content
    if(oldMessage && message.content === oldMessage.content) return false;

    return true;
}

const dotenv = require('dotenv').config();
const {
    createClient,
    IHLManager,
} = require('./lib/ihlManager');

const ihlManager = new IHLManager(process.env);
const client = createClient(process.env);
ihlManager.init(client);