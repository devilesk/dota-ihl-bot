const { Command } = require('discord.js-commando');
const {
    ihlManager,
    getInhouseState,
    isMessageFromAnyInhouse,
    isMessageFromAnyInhouseAdmin,
    isMessageFromAnyInhouseLobby,
} = require('./ihlManager');
const {
    getLobbyFromInhouseByChannelId,
} = require('./ihl');
const {
    findUserByDiscordId,
} = require('./db');

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
    
    get inhouseStates() {
        return ihlManager.inhouseStates;
    }

    hasPermission(msg) {
        if (this.validation.clientOwner && !this.client.isOwner(msg.author)) {
            return false;
        }
        if (this.validation.inhouseAdmin && !isMessageFromAnyInhouseAdmin(this.inhouseStates, msg)) {
            return false;
        }
        if (this.validation.inhouseState && !isMessageFromAnyInhouse(this.inhouseStates, msg)) {
            return false;
        }
        if (this.validation.lobbyState && !isMessageFromAnyInhouseLobby(this.inhouseStates, msg)) {
            return false;
        }
        return true;
    }
    
    async onMsg() {
        return true;
    }

    async run(msg, args) {
        const guild = msg.channel.guild;
        const inhouseState = getInhouseState(this.inhouseStates, msg.channel.guild.id);
        const lobbyState = inhouseState ? getLobbyFromInhouseByChannelId(inhouseState, msg.channel.id) : null;
        const inhouseUser = await findUserByDiscordId(guild.id)(msg.author.id);
        
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
            inhouseState,
            lobbyState,
            inhouseUser,
        }, args);
    }
};
