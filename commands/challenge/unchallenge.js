const { Command } = require('discord.js-commando');
const {
    ihlManager,
    isMessageFromAnyInhouse,
    parseMessage,
} = require('../../lib/ihlManager');
const {
    findUserByDiscordId,
    getChallengeBetweenUsers,
    destroyChallengeBetweenUsers,
} = require('../../lib/db');
const CONSTANTS = require('../../lib/constants');

/**
 * @class UnchallengeCommand
 * @extends external:Command
 */
module.exports = class UnchallengeCommand extends Command {
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
        });
    }
    
    hasPermission(msg) {
        return isMessageFromAnyInhouse(ihlManager.inhouseStates, msg);
    }

    async run(msg, { member }) {
        let { giver, lobbyState, inhouseState } = await parseMessage(ihlManager.inhouseStates, msg);
        if (giver) {
            const receiver = await findUserByDiscordId(msg.channel.guild)(member.id);
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
        else {
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
    }
};
