const logger = require('../../lib/logger');
const { Command } = require('discord.js-commando');
const { findOrCreateLeague, queryLeaderboardRank } = require('../../lib/db');

/**
 * @class LeaderboardCommand
 * @extends external:Command
 */
module.exports = class LeaderboardCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'leaderboard',
            group: 'ihl',
            memberName: 'leaderboard',
            guildOnly: true,
            description: 'Show inhouse leaderboard.',
        });
    }

    async run(msg) {
        const guild = msg.channel.guild;
        const league = await findOrCreateLeague(guild.id);
        const leaderboard = await queryLeaderboardRank(league.id)(league.current_season_id)(10);
        logger.debug(leaderboard.length);
        const data = leaderboard.map((user) => {
            const member = guild.members.get(user.discord_id);
            const name = member ? member.displayName : user.nickname;
            const rank = `${user.rank}.`;
            const record = `${user.wins.toString().padStart(2)}-${user.losses.toString().padEnd(2)}`;
            return `\`${rank.padEnd(3)} ${user.rating.toString().padEnd(4)} ${record} ${name}\``;
        });

        await msg.channel.send({
            embed: {
                color: 100000,
                fields: [
                    {
                        name: 'Leaderboard',
                        value: data.join('\n'),
                    },
                ],
            },
        });
    }
};
