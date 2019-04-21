const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Ihl = require('../../lib/ihl');
const Db = require('../../lib/db');
const getSteamProfile = require('../../lib/util/getSteamProfile');

/**
 * @class RegisterCommand
 * @extends IHLCommand
 */
module.exports = class RegisterCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'register',
            group: 'ihl',
            memberName: 'register',
            guildOnly: true,
            description: 'Registers your steam account to your discord account.',
            examples: ['register https://www.dotabuff.com/players/70388657', 'register https://www.opendota.com/players/70388657', 'register https://steamcommunity.com/id/DendiQ/'],
            args: [
                {
                    key: 'text',
                    prompt: 'Provide your steam id or a link to your dotabuff, opendota, or steam profile',
                    type: 'string',
                },
                {
                    key: 'member',
                    prompt: 'Provide a member to register. (Admin only)',
                    type: 'member',
                    default: '',
                },
            ],
        }, {
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild, inhouseState, inhouseUser }, { text, member }) {
        logger.silly(`RegisterCommand ${inhouseUser} ${text} ${member}`);
        let memberToRegister = msg.member;
        let userToRegister = inhouseUser;
        if (member) {
            if (inhouseUser && memberToRegister.roles.has(inhouseState.adminRole.id)) {
                logger.silly('RegisterCommand admin registering user');
                userToRegister = await Db.findUserByDiscordId(guild.id)(member.id);
                memberToRegister = member;
            }
            else {
                return msg.say('Only inhouse admins can register other members.');
            }
        }
        if (userToRegister) {
            logger.silly('RegisterCommand already registered');
            return msg.say(`${memberToRegister.displayName} already registered.`);
        }
        let steamId64;
        try {
            steamId64 = await Ihl.parseSteamID64(text);
            if (steamId64 != null) {
                const steamProfile = await getSteamProfile(steamId64);
                if (steamProfile != null) {
                    userToRegister = await Ihl.registerUser(guild.id, steamProfile.steamid, memberToRegister.id);
                    if (userToRegister) {
                        logger.silly(`RegisterCommand Registered ${userToRegister.steamid_64}`);
                        return msg.say(`Registered ${memberToRegister.displayName} ${userToRegister.steamid_64}.`);
                    }
                    logger.silly('RegisterCommand failed to create new user');
                    return msg.say('Failed to create new user.');
                }
            }
            logger.silly('RegisterCommand invalid steam id');
            return msg.say('Invalid steam id.');
        }
        catch (e) {
            logger.silly(`RegisterCommand error: ${e.name}, ${e.message}`);
            if (e instanceof Error && e.name === 'SequelizeUniqueConstraintError' && e.message === 'Validation error') {
                return msg.say(`Failed to register. Steam id ${steamId64} already registered.`);
            }
            return msg.say('Failed to register.');
        }
    }
};
