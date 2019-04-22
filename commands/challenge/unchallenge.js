const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');

/**
 * @class UnchallengeCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class UnchallengeCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'unchallenge',
            aliases: ['challenge-remove', 'remove-challenge', 'delete-challenge', 'challenge-delete'],
            group: 'challenge',
            memberName: 'unchallenge',
            guildOnly: true,
            description: 'Player unchallenge command.',
            examples: ['unchallenge @Ari*'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a player mention.',
                    type: 'member',
                },
            ],
        }, { lobbyState: false });
    }

    async onMsg({ msg, guild, inhouseUser }, { member }) {
        const giver = inhouseUser;
        const receiver = await Db.findUserByDiscordId(guild.id)(member.id);
        if (receiver) {
            const challengeFromGiver = await Db.getChallengeBetweenUsers(giver)(receiver);
            if (challengeFromGiver) {
                if (challengeFromGiver.accepted) {
                    return msg.say('Challenge already accepted.');
                }
                await Db.destroyChallengeBetweenUsers(giver)(receiver);
                return msg.say('Challenge revoked.');
            }
            return msg.say('No challenge found.');
        }
        return msg.say('Challenged user not found.');
    }
};
