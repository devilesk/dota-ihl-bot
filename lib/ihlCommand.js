const { Command } = require('discord.js-commando');
const Lobby = require('./lobby');
const Ihl = require('./ihl');
const IHLManager = require('./ihlManager');
const Db = require('./db');
const Exceptions = require('./exceptions');

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
            botPermissions: IHLManager.IHLManager.botPermissions,
            ...validation,
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

    // eslint-disable-next-line class-methods-use-this
    async onMsg() {
        // overridden by commands
    }

    async run(msg, args) {
        const { guild } = msg.channel;
        if (guild && this.validation.botPermissions.length) {
            const missingPermissions = this.validation.botPermissions.filter(permission => !guild.me.hasPermission(permission));
            if (missingPermissions.length) {
                await msg.say(`Bot missing permissions: ${missingPermissions.join(', ')}`);
                return null;
            }
        }
        const league = guild ? await Db.findLeague(guild.id) : null;
        const inhouseState = league ? await Ihl.createInhouseState({ league, guild }) : null;
        const lobby = inhouseState ? await Db.findLobbyByDiscordChannel(guild.id)(msg.channel.id) : null;
        const lobbyState = lobby ? await Lobby.lobbyToLobbyState(inhouseState)(lobby) : null;
        const inhouseUser = guild ? await Db.findUserByDiscordId(guild.id)(msg.author.id) : null;
        if (this.validation.inhouseAdmin) {
            try {
                if (msg.member && !msg.member.roles.has(inhouseState.adminRole.id)) {
                    return null;
                }
            }
            catch (e) {
                if (e instanceof Exceptions.DiscordUserNotFound) {
                    return null;
                }

                throw e;
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
                await msg.say(`${msg.author.username} not vouched.`);
                return null;
            }
            if (!inhouseUser) {
                await msg.say(`${msg.author.username} not found. (Have you registered with \`!register\`?)`);
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
