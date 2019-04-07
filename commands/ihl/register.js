const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Ihl = require('../../lib/ihl');

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
            ],
        }, {
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild, inhouseUser }, { text }) {
        const discord_id = msg.author.id;
        let user;
        let steamid_64;
        if (inhouseUser) {
            msg.say(`${msg.author.username} already registered.`);
        }
        else {
            try {
                steamid_64 = await Ihl.parseSteamID64(text);
                if (steamid_64 != null) {
                    user = await Ihl.registerUser(guild.id, steamid_64, discord_id);

                    if (user) {
                        logger.debug(`RegisterCommand Registered ${user.steamid_64}`);
                        await msg.say(`Registered ${user.steamid_64}`);
                    }
                    else {
                        await msg.say(`Failed to create new user.`);
                    }
                }
                else {
                    await msg.say(`Invalid steam id.`);
                }
            }
            catch (e) {
                logger.debug(`RegisterCommand error: ${e.name}, ${e.message}`);
                if (e instanceof Error && e.name === 'SequelizeUniqueConstraintError' && e.message === 'Validation error') {
                    await msg.say(`Failed to register. Steam id ${steamid_64} already registered.`);
                }
                else {
                    await msg.say(`Failed to register.`);
                }
            }
        }
    }
};
