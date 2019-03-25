const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const {
    queryUserLeaderboardRank,
} = require('../../lib/db');
const convertor = require('steam-id-convertor');
const CONSTANTS = require('../../lib/constants');
const {
    findUser,
} = require('../../lib/ihlManager');

const RANK_TO_MEDAL = {
    70: 'Divine',
    60: 'Ancient',
    50: 'Legend',
    40: 'Archon',
    30: 'Crusader',
    20: 'Guardian',
    10: 'Herald',
};

const rankTierToMedalName = (rank_tier) => {
    const rank = Math.floor(rank_tier / 10) * 10;
    const tier = Math.min(rank_tier % 10, 5);
    return `${RANK_TO_MEDAL[rank]} ${tier}`;
};

/**
 * @class WhoisCommand
 * @extends IHLCommand
 */
module.exports = class WhoisCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'whois',
            group: 'ihl',
            memberName: 'whois',
            guildOnly: true,
            description: 'Look up inhouse player information.',
            examples: ['whois @Ari*', 'whois Sasquatch'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a player name or mention.',
                    type: 'string',
                },
            ],
        }, {
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, league, guild }, { member }) {
        let wins = 0;
        let losses = 0;

        const [user, discord_user, result_type] = await findUser(guild)(member);

        let footerText;
        switch (result_type) {
        case CONSTANTS.MATCH_EXACT_DISCORD_MENTION:
            footerText = `Exact match for ${discord_user} by discord mention`;
            break;
        case CONSTANTS.MATCH_EXACT_DISCORD_NAME:
            footerText = `Exact match for ${member} by discord name`;
            break;
        case CONSTANTS.MATCH_CLOSEST_NICKNAME:
            footerText = `Closest match for ${member} by nickname`;
            break;
        }

        if (user) {
            logger.debug(user.nickname);

            let roles = [];
            for (let i = 1; i <= 5; i++) {
                logger.debug(user[`role_${i}`]);
                roles.push([i, user[`role_${i}`]]);
            }
            logger.debug(roles);
            roles = roles.filter(([role, pref]) => pref !== -1).sort(([r1, p1], [r2, p2]) => p1 - p2).map(([r, p]) => r);
            const account_id = convertor.to32(user.steamid_64);

            const [leaderboard] = await user.getLeaderboards({ where: { season_id: league.current_season_id } });
            logger.debug(leaderboard);
            if (leaderboard) {
                wins = leaderboard.wins;
                losses = leaderboard.losses;
            }
            const rep = (await user.getReputationsReceived()).length;
            const commends = (await user.getCommendsReceived()).length;

            const rank = await queryUserLeaderboardRank(league.id)(league.current_season_id)(user.id);

            logger.debug(`rank ${rank}`);

            await msg.channel.send({
                embed: {
                    color: 100000,
                    fields: [
                        {
                            name: 'Discord',
                            value: `${discord_user.user.username}#${discord_user.user.discriminator}`,
                            inline: true,
                        },
                        {
                            name: 'Medal',
                            value: rankTierToMedalName(user.rank_tier),
                            inline: true,
                        },
                        {
                            name: 'IH Rating',
                            value: leaderboard ? leaderboard.rating : 'N/A',
                            inline: true,
                        },
                        {
                            name: 'Rank',
                            value: rank || 'N/A',
                            inline: true,
                        },
                        {
                            name: 'Roles',
                            value: roles.join(',') || 'N/A',
                            inline: true,
                        },
                        {
                            name: 'Commends/Rep',
                            value: `${commends}/${rep}`,
                            inline: true,
                        },
                        {
                            name: 'Win-Loss',
                            value: `${wins}-${losses}`,
                            inline: true,
                        },
                        {
                            name: 'Game Mode Pref.',
                            value: `${user.game_mode_preference.replace('DOTA_GAMEMODE_', '')}`,
                            inline: true,
                        },
                        {
                            name: 'Links',
                            value: `[DB](https://www.dotabuff.com/players/${account_id})/[OD](https://www.opendota.com/players/${account_id})/[Steam](http://steamcommunity.com/profiles/${user.steamid_64})`,
                            inline: true,
                        },
                    ],
                    footer: {
                        text: footerText,
                    },
                },
            });
        }
    }
};
