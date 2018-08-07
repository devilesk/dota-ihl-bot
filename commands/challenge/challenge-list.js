const { Command } = require('discord.js-commando');
const {
    ihlManager,
    isMessageFromInhouse,
    parseMessage,
} = require('../../lib/ihlManager');
const {
    hasActiveLobbies,
} = require('../../lib/ihl');
const {
    findUserByDiscordId,
    getChallengeBetweenUsers,
    createChallenge,
} = require('../../lib/db');
const {
    resolveUser,
} = require('../../lib/guild');
const CONSTANTS = require('../../lib/constants');

/**
 * @class ChallengeListCommand
 * @extends external:Command
 */
module.exports = class ChallengeListCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'challenge-list',
            aliases: ['challenges'],
            group: 'challenge',
            memberName: 'challenge-list',
            guildOnly: true,
            description: 'View your current challenges.',
            examples: ['challenge-list', 'challenges'],
        });
    }
    
    hasPermission(msg) {
        return isMessageFromInhouse(ihlManager.inhouseStates, msg);
    }

    async run(msg) {
        const guild = msg.channel.guild;
        let { user, lobbyState, inhouseState } = await parseMessage(ihlManager.inhouseStates, msg);
        if (user) {
            const receivers = await mapPromise(async (challenge) => {
                const receiver = await challenge.getRecipient();
                return resolveUser(guild)(receiver);
            }, user.getChallengesGiven());

            const givers = await mapPromise(async (challenge) => {
                const giver = await challenge.getGiver();
                return resolveUser(guild)(giver);
            }, user.getChallengesReceived());
            
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
        else {
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
    }
};
