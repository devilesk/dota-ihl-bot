const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const { findUser } = require('../../lib/ihlManager');
const Db = require('../../lib/db');
const Lobby = require('../../lib/lobby');
const CONSTANTS = require('../../lib/constants');

/**
 * @class CommendCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
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
                    key: 'matchId',
                    prompt: 'Provide a match id.',
                    type: 'string',
                },
            ],
        }, { lobbyState: false });
    }

    async onMsg({ msg, guild, inhouseUser }, { member, matchId }) {
        const [user, discordUser] = await findUser(guild)(member);
        const fromUser = inhouseUser;
        const lobby = await Db.findLobbyByMatchId(matchId);
        if (lobby) {
            logger.silly(`CommendCommand ${lobby.state}`);
            if (lobby.state === CONSTANTS.STATE_COMPLETED) {
                if (user && fromUser) {
                    logger.silly('CommendCommand users exist');
                    const players = await Lobby.getPlayers()(lobby);
                    if (!players.find(player => player.id === user.id)) {
                        return msg.say(`${discordUser.displayName} not a player in the match.`);
                    }
                    if (!players.find(player => player.id === fromUser.id)) {
                        return msg.say(`${msg.author.username} not a player in the match.`);
                    }
                    logger.silly('CommendCommand users on team');
                    if (user.id !== fromUser.id) {
                        logger.silly(`CommendCommand ${user.id} ${fromUser.id}`);
                        const [, created] = await Db.findOrCreateCommend(lobby)(fromUser)(user);
                        if (created) {
                            return msg.say(`${msg.author.username} commends ${discordUser.displayName}`);
                        }
                        return msg.say(`${discordUser.displayName} already commended.`);
                    }
                    return msg.say('Cannot commend yourself.');
                }
                return msg.say(IHLCommand.UserNotFoundMessage);
            }
            return msg.say(`Match ${matchId} not finished yet.`);
        }
        return msg.say(`Match ${matchId} not found.`);
    }
};
