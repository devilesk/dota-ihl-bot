const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const { findUser } = require('../../lib/ihlManager');
const Db = require('../../lib/db');
const Lobby = require('../../lib/lobby');
const CONSTANTS = require('../../lib/constants');

/**
 * @class CommendCommand
 * @extends IHLCommand
 */
module.exports = class CommendCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'commend',
            group: 'ihl',
            memberName: 'commend',
            guildOnly: true,
            description: 'Commend a player after a game.',
            examples: ['commend @Ari*', 'commend Sasquatch'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a player name or mention.',
                    type: 'string',
                },
                {
                    key: 'match_id',
                    prompt: 'Provide a match id.',
                    type: 'string',
                },
            ],
        }, { lobbyState: false });
    }

    async onMsg({ msg, guild, inhouseUser }, { member, match_id }) {
        const [user, discordUser] = await findUser(guild)(member);
        const fromUser = inhouseUser;
        const lobby = await Db.findLobbyByMatchId(match_id);
        const players = await Lobby.getPlayers()(lobby);
        if (lobby) {
            logger.silly(`CommendCommand ${lobby.state}`);
            if (lobby.state === CONSTANTS.STATE_COMPLETED) {
                if (user && fromUser) {
                    logger.silly('CommendCommand users exist');
                    if (!players.find(player => player.id === user.id)) {
                        await msg.say(`${discordUser.displayName} not a player in the match.`);
                    }
                    else if (!players.find(player => player.id === fromUser.id)) {
                        await msg.say(`${msg.author.username} not a player in the match.`);
                    }
                    else {
                        logger.silly('CommendCommand users on team');
                        if (user.id !== fromUser.id) {
                            logger.silly(`CommendCommand ${user.id} ${fromUser.id}`);
                            const [, created] = await Db.findOrCreateCommend(lobby)(fromUser)(user);
                            if (created) {
                                await msg.say(`${msg.author.username} commends ${discordUser.displayName}`);
                            }
                            else {
                                await msg.say(`${discordUser.displayName} already commended.`);
                            }
                        }
                        else {
                            await msg.say('Cannot commend yourself.');
                        }
                    }
                }
            }
            else {
                await msg.say(`Match ${match_id} not finished yet.`);
            }
        }
        else {
            await msg.say(`Match ${match_id} not found.`);
        }
    }
};
