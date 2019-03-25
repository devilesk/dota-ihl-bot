const { Command } = require('discord.js-commando');
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
    resolveUser,
} = require('./guild');
const {
    DiscordUserNotFound,
} = require('./exceptions');

/**
 * @class IHLCommand
 * @extends external:Command
 */
module.exports = class IHLCommand extends Command {
    constructor(client, options, validation) {
        super(client, options);
        
        this.validation = {
            clientOwner: false,
            inhouseAdmin: false,
            inhouseState: true,
            lobbyState: true,
            inhouseUser: true,
            inhouseUserVouched: true,
            ...validation
        };
    }
    
    get ihlManager() {
        return this.client.ihlManager;
    }

    hasPermission(msg) {
        if (this.validation.clientOwner && !this.client.isOwner(msg.author)) {
            return false;
        }
        return true;
    }
    
    async onMsg() {}

    async run(msg, args) {
        const guild = msg.channel.guild;
        const league = await findLeague(guild.id);
        const inhouseState = league ? await createInhouseState({ league, guild }) : null;
        const lobby = inhouseState ? await findLobbyByDiscordChannel(guild.id)(msg.channel.id) : null;
        const lobbyState = lobby ? await lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })(inhouseState)(lobby) : null;
        const inhouseUser = await findUserByDiscordId(guild.id)(msg.author.id);
        if (this.validation.inhouseAdmin) {
            try {
                const member = await resolveUser(guild)(msg.author);
                if (!member.roles.has(inhouseState.adminRole.id)) {
                    return null;
                }
            }
            catch (e) {
                if (e instanceof DiscordUserNotFound) {
                    return null;
                }
                else {
                    throw e;
                }
            }
        }
        
        if (this.validation.inhouseState && !inhouseState) {
            await msg.say('Not in an inhouse league.');
            return null;
        }
        
        if (this.validation.lobbyState && !lobbyState) {
            await msg.say('Not in a lobby channel.');
            return null;
        }
        
        if (this.validation.inhouseUser) {
            if (this.validation.inhouseUserVouched && (!inhouseUser || !inhouseUser.vouched)) {
                await msg.say('${msg.author.username} not vouched.');
                return null;
            }
            if (!inhouseUser) {
                await msg.say('${msg.author.username} not found. (Have you registered with `!register`?)');
                return null;
            }
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
