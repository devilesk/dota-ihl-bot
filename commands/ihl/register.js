const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const convertor = require('steam-id-convertor');
const BigNumber = require('bignumber.js');
const Promise = require('bluebird');
const steam = require('steamidconvert')(process.env.STEAM_API_KEY);
const {
    registerUser,
} = require('../../lib/ihl');

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
                if (text.indexOf('steamcommunity.com/id') !== -1) {
                    const vanityName = text.match(/([^\/]*)\/*$/)[1];
                    const convertVanity = Promise.promisify(steam.convertVanity, {context: steam});
                    try {
                        logger.debug(`RegisterCommand convertVanity ${vanityName}`);
                        steamid_64 = await convertVanity(vanityName);
                        logger.debug(`RegisterCommand convertVanity ${vanityName} ${steamid_64}`);
                        user = await registerUser(guild.id, steamid_64, discord_id);
                    }
                    catch (e) {
                        logger.debug(`RegisterCommand convertVanity failed`);
                        await msg.say(`Could not get steam id from ${text}`);
                    }
                }
                else if (text.indexOf('steamcommunity.com/profiles') !== -1) {
                    steamid_64 = text.match(/([^\/]*)\/*$/)[1];
                    user = await registerUser(guild.id, steamid_64, discord_id);
                }
                else if (text.indexOf('dotabuff.com/players') !== -1 || text.indexOf('opendota.com/players') !== -1) {
                    const steamid_32 = text.match(/([^\/]*)\/*$/)[1];
                    steamid_64 = convertor.to64(steamid_32);
                    user = await registerUser(guild.id, steamid_64, discord_id);
                }
                else {
                    const max = new BigNumber('4294967295');
                    const id = new BigNumber(text);
                    steamid_64 = id.comparedTo(max) <= 0 ? convertor.to64(id) : id.toString();
                    user = await registerUser(guild.id, steamid_64, discord_id);
                }

                if (user) {
                    logger.debug(`RegisterCommand Registered ${user.steamid_64}`);
                    await msg.say(`Registered ${user.steamid_64}`);
                }
                else {
                    await msg.say(`Failed to create new user.`);
                }
            }
            catch (e) {
                logger.debug(`RegisterCommand error: ${e.name}, ${e.message}`);
                if (e instanceof Error && (e.name === 'BigNumber Error' || e.message.indexOf('[BigNumber Error]') === 0)) {
                    logger.debug(`RegisterCommand BigNumber error`);
                    await msg.say(`Invalid steam id.`);
                }
                else if (e instanceof Error && e.name === 'SequelizeUniqueConstraintError' && e.message === 'Validation error') {
                    await msg.say(`Failed to register. Steam id ${steamid_64} already registered.`);
                }
                else {
                    await msg.say(`Failed to register.`);
                }
            }
        }
    }
};
