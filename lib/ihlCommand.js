const logger = require('./logger');
const { Command } = require('discord.js-commando');
const Lobby = require('./lobby');
const Ihl = require('./ihl');
const IHLManager = require('./ihlManager');
const Db = require('./db');
const Exceptions = require('./exceptions');

/**
 * @module ihlCommand
 */

/**
 * External namespace for discord.js Commando classes.
 * @external commando
 * @category Other
 * @see {@link https://github.com/discordjs/Commando/tree/djs-v11}
 */

/**
 * @class IHLCommand
 * @extends external:commando.Command
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

    static get UserNotFoundMessage() {
        return 'User not found. (Has user registered with `!register`?)';
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
                return msg.say(`Bot missing permissions: ${missingPermissions.join(', ')}`);
            }
        }
        const league = guild ? await Db.findLeague(guild.id) : null;
        const inhouseState = league ? await Ihl.createInhouseState({ league, guild }) : null;
        const lobby = inhouseState ? await Db.findLobbyByDiscordChannel(guild.id)(msg.channel.id) : null;
        const lobbyState = lobby ? await Lobby.lobbyToLobbyState(inhouseState)(lobby) : null;
        const inhouseUser = guild ? await Db.findUserByDiscordId(guild.id)(msg.author.id) : null;
        if (this.validation.inhouseState && !inhouseState) {
            return msg.say('Not in an inhouse league.');
        }

        if (this.validation.inhouseAdmin) {
            try {
                if (msg.member && !msg.member.roles.has(inhouseState.adminRole.id)) {
                    logger.warn(`missing admin role ${inhouseState.adminRole.name}`);
                    return null;
                }
            }
            catch (e) {
                if (e instanceof Exceptions.DiscordUserNotFound) {
                    logger.warn('missing admin user');
                    return null;
                }

                throw e;
            }
        }

        if (this.validation.lobbyState && !lobbyState) {
            return msg.say('Not in a lobby channel.');
        }

        if (this.validation.inhouseUser) {
            if (this.validation.inhouseUserVouched && (!inhouseUser || !inhouseUser.vouched)) {
                return msg.say(`${msg.author.username} not vouched.`);
            }
            if (!inhouseUser) {
                return msg.say(`${msg.author.username} not found. (Have you registered with \`!register\`?)`);
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
