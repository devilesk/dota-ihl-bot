const { Command } = require('discord.js-commando');
const {
    ihlManager,
    isMessageFromAnyInhouse,
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
const CONSTANTS = require('../../lib/constants');

/**
 * @class ChallengeCommand
 * @extends external:Command
 */
module.exports = class ChallengeCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'challenge',
            group: 'challenge',
            memberName: 'challenge',
            guildOnly: true,
            description: 'Player challenge command.',
            examples: ['challenge @Ari*'],
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
            // check if giver already in a lobby
            let inLobby = await hasActiveLobbies(giver);
            if (!inLobby) {
                const receiver = await findUserByDiscordId(msg.channel.guild)(member.id);
                if (receiver) {
                    // check if receiver already in a lobby
                    inLobby = await hasActiveLobbies(receiver);
                    if (!inLobby) {
                        // check if giver has issued a challenge to this receiver already
                        const challengeFromGiver = await getChallengeBetweenUsers(giver)(receiver);
                        if (challengeFromGiver) {
                            await msg.say('${member} already challenged.');
                        }
                        else {
                            // check if receiver has issued a challenge to the giver already
                            const challengeFromReceiver = await getChallengeBetweenUsers(receiver)(giver);
                            if (challengeFromReceiver) {
                                // accept receiver's challenge if not yet accepted
                                if (!challengeFromReceiver.accepted) {
                                    await ihlManager.createChallengeLobbyForInhouse(inhouseState, challengeFromReceiver, receiver, giver);
                                }
                            }
                            else {
                                // issue new challenge
                                const challenge = await createChallenge(giver)(receiver);
                                await msg.say('${msg.author} challenges ${member}.');
                            }
                        }
                    }
                    else {
                        await msg.say('The player you are challenging is already in a lobby.');
                    }
                }
                else {
                    await msg.say('Challenged user not found.');
                }
            }
            else {
                await msg.say('Cannot challenge while you are in a lobby.');
            }
        }
        else {
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
    }
};
