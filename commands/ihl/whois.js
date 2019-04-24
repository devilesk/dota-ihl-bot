const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');
const convertor = require('steam-id-convertor');
const CONSTANTS = require('../../lib/constants');
const { findUser } = require('../../lib/ihlManager');

const RANK_TO_MEDAL = {
    80: 'Immortal',
    70: 'Divine',
    60: 'Ancient',
    50: 'Legend',
    40: 'Archon',
    30: 'Crusader',
    20: 'Guardian',
    10: 'Herald',
    0: 'Uncalibrated',
};

const rankTierToMedalName = (_rankTier) => {
    logger.silly(`rankTierToMedalName ${_rankTier}`);
    const rankTier = _rankTier || 0;
    const rank = Math.floor(rankTier / 10) * 10;
    const tier = rankTier % 10;
    logger.silly(`rankTierToMedalName ${rank} ${tier}`);
    let medal = 'Unknown';
    if (rank >= 0 && rank < 90) {
        medal = `${RANK_TO_MEDAL[rank]}`;
        if (rank !== 80 && rank > 0 && tier > 0) {
            medal += ` ${tier}`;
        }
    }
    return medal;
};

/**
 * @class WhoisCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class WhoisCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'whois',
            aliases: ['who', 'info', 'stats', 'lookup', 'profile', 'whoami'],
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
                    default: '',
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
        const memberToFind = member || msg.author;

        const [user, discordUser, resultType] = await findUser(guild)(memberToFind);

        let footerText;
        switch (resultType) {
        case CONSTANTS.MATCH_EXACT_DISCORD_MENTION:
            footerText = `Exact match for ${discordUser.displayName} by discord mention`;
            break;
        case CONSTANTS.MATCH_EXACT_DISCORD_NAME:
            footerText = `Exact match for ${memberToFind} by discord name`;
            break;
        case CONSTANTS.MATCH_STEAMID_64:
            footerText = `Parsed steam id for ${discordUser.displayName}`;
            break;
        case CONSTANTS.MATCH_EXACT_NICKNAME:
            footerText = `Exact match for ${memberToFind} by nickname`;
            break;
        case CONSTANTS.MATCH_CLOSEST_NICKNAME:
            footerText = `Closest match for ${memberToFind} by nickname`;
            break;
        default:
            footerText = '';
        }

        if (user) {
            logger.silly(user.nickname);

            let roles = [];
            for (let i = 1; i <= 5; i++) {
                logger.silly(user[`role${i}`]);
                roles.push([i, user[`role${i}`]]);
            }
            logger.silly(roles);
            roles = roles.filter(([, pref]) => pref !== -1).sort(([, p1], [, p2]) => p1 - p2).map(([r]) => r);
            const accountId = convertor.to32(user.steamId64);

            const [leaderboard] = await user.getLeaderboards({ where: { seasonId: league.currentSeasonId } });
            logger.silly(leaderboard);
            if (leaderboard) {
                wins = leaderboard.wins;
                losses = leaderboard.losses;
            }
            const rep = (await user.getReputationsReceived()).length;
            const commends = (await user.getCommendsReceived()).length;

            const rank = await Db.queryUserLeaderboardRank(league.id)(league.currentSeasonId)(user.id);

            logger.silly(`rank ${rank}`);

            return msg.channel.send({
                embed: {
                    color: 100000,
                    fields: [
                        {
                            name: 'Discord',
                            value: `${discordUser.user.username}#${discordUser.user.discriminator}`,
                            inline: true,
                        },
                        {
                            name: 'Nickname',
                            value: user.nickname || 'N/A',
                            inline: true,
                        },
                        {
                            name: 'Medal',
                            value: rankTierToMedalName(user.rankTier),
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
                            name: 'Rep/Commends',
                            value: `${rep}/${commends}`,
                            inline: true,
                        },
                        {
                            name: 'Win-Loss',
                            value: `${wins}-${losses}`,
                            inline: true,
                        },
                        {
                            name: 'Preferred Mode',
                            value: `${user.gameModePreference.replace('DOTA_GAMEMODE_', '')}`,
                            inline: true,
                        },
                        {
                            name: 'Vouched',
                            value: `${user.vouched}`,
                            inline: true,
                        },
                        {
                            name: 'Queue Timeout',
                            value: Date.now() < user.queueTimeout ? user.queueTimeout : null,
                            inline: true,
                        },
                        {
                            name: 'Links',
                            value: `[DB](https://www.dotabuff.com/players/${accountId})/[OD](https://www.opendota.com/players/${accountId})/[SZ](https://stratz.com/en-us/player/${accountId})/[Steam](http://steamcommunity.com/profiles/${user.steamId64})`,
                            inline: true,
                        },
                    ].filter(field => field.value !== null),
                    footer: { text: footerText },
                },
            });
        }
        return msg.say(`${memberToFind} not found.`);
    }
};
