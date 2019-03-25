const IHLCommand = require('../../lib/ihlCommand');
const {
    findUserByDiscordId,
    getChallengeBetweenUsers,
    destroyChallengeBetweenUsers,
} = require('../../lib/db');

/**
 * @class UnchallengeCommand
 * @extends IHLCommand
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
                }
            ],
        }, {
            lobbyState: false,
        });
    }

    async onMsg({ msg, guild, inhouseUser }, { member }) {
        const giver = inhouseUser;
        const receiver = await findUserByDiscordId(guild.id)(member.id);
        if (receiver) {
            const challengeFromGiver = await getChallengeBetweenUsers(giver)(receiver);
            if (challengeFromGiver) {
                if (challengeFromGiver.accepted) {
                    await msg.say('Challenge already accepted.');
                }
                else {
                    await destroyChallengeBetweenUsers(giver)(receiver);
                    await msg.say('Challenge revoked.');
                }
            }
            else {
                await msg.say('No challenge found.');
            }
        }
        else {
            await msg.say('Challenged user not found.');
        }
    }
};
