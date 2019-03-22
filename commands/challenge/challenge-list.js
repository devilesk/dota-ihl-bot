const IHLCommand = require('../../lib/ihlCommand');
const {
    resolveUser,
} = require('../../lib/guild');

/**
 * @class ChallengeListCommand
 * @extends IHLCommand
 */
module.exports = class ChallengeListCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'challenge-list',
            aliases: ['challenges'],
            group: 'challenge',
            memberName: 'challenge-list',
            guildOnly: true,
            description: 'View your current challenges.',
            examples: ['challenge-list', 'challenges'],
        }, {
            lobbyState: false,
        });
    }

    async onMsg({ msg, guild, inhouseUser }) {
        const receivers = await mapPromise(async (challenge) => {
            const receiver = await challenge.getRecipient();
            return resolveUser(guild)(receiver);
        }, inhouseUser.getChallengesGiven());

        const givers = await mapPromise(async (challenge) => {
            const giver = await challenge.getGiver();
            return resolveUser(guild)(giver);
        }, inhouseUser.getChallengesReceived());
        
        let text = '';
        
        if (receivers.length) {
            text += 'Challenges given to: ';
            text += receivers.join(', ');
        }
        else {
            text += 'No challenges given.';
        }
        
        if (receivers.length) {
            text += '\nChallenges received from: ';
            text += givers.join(', ');
        }
        else {
            text += '\nNo challenges received.';
        }
        
        await msg.say(text);
    }
};
