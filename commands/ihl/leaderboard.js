const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');

/**
 * @class LeaderboardCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class LeaderboardCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'leaderboard',
            group: 'ihl',
            memberName: 'leaderboard',
            guildOnly: true,
            description: 'Show inhouse leaderboard.',
        }, {
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, league, guild }) {
        const leaderboard = await Db.queryLeaderboardRank(league.id)(league.currentSeasonId)(10);
        logger.silly(leaderboard.length);
        const data = leaderboard.map((user) => {
            const member = guild.members.get(user.discordId);
            const name = member ? member.displayName : user.nickname;
            const rank = `${user.rank}.`;
            const record = `${user.wins.toString().padStart(2)}-${user.losses.toString().padEnd(2)}`;
            return `\`${rank.padEnd(3)} ${user.rating.toString().padEnd(4)} ${record} ${name}\``;
        });

        return msg.channel.send({
            embed: {
                color: 100000,
                fields: [
                    {
                        name: 'Leaderboard',
                        value: data.join('\n') || 'N/A',
                    },
                ],
            },
        });
    }
};
