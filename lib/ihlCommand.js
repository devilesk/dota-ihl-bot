const { Command } = require('discord.js-commando');
const {
    ihlManager,
} = require('./ihlManager');
const {
    createInhouseState,
} = require('./ihl');
const {
    lobbyToLobbyState,
} = require('./lobby');
const {
    findLeague,
    findLobbyByDiscordChannel,
    findUserByDiscordId,
} = require('./db');
const {
    findOrCreateChannelInCategory,
    makeRole,
} = require('./guild');

/**
 * @class IHLCommand
 * @extends external:Command
 */
module.exports = class IHLCommand extends Command {
    constructor(client, options, validation) {
        super(client, options);
        
        this.ihlManager = ihlManager;
        this.validation = {
            clientOwner: false,
            inhouseAdmin: false,
            inhouseState: true,
            lobbyState: true,
            inhouseUser: true,
            ...validation
        };
    }

    hasPermission(msg) {
        if (this.validation.clientOwner && !this.client.isOwner(msg.author)) {
            return false;
        }
        return true;
    }
    
    async onMsg() {
        return true;
    }

    async run(msg, args) {
        const guild = msg.channel.guild;
        const league = await findLeague(guild.id);
        const inhouseState = createInhouseState({ league, guild });
        const lobby = inhouseState ? await findLobbyByDiscordChannel(guild.id)(msg.channel.id) : null;
        const lobbyState = lobby ? await lobbyToLobbyState(inhouseState)({ findOrCreateChannelInCategory, makeRole })(lobby) : null;
        const inhouseUser = await findUserByDiscordId(guild.id)(msg.author.id);
        
        if (this.validation.inhouseAdmin && !msg.author.roles.has(inhouseState.adminRole.id)) {
            return false;
        }
        
        if (this.validation.inhouseState && !inhouseState) {
            await msg.say('Not in an inhouse league.');
            return false;
        }
        
        if (this.validation.lobbyState && !lobbyState) {
            await msg.say('Not in a lobby channel.');
            return false;
        }
        
        if (this.validation.inhouseUser && !inhouseUser) {
            await msg.say('User not found. (Has user registered with `!register`?)');
            return false;
        }
        
        return this.onMsg({
            msg,
            guild,
            league,
            inhouseState,
            lobby,
            lobbyState,
            inhouseUser,
        }, args);
    }
};
