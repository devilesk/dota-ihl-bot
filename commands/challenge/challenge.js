const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const {
    hasActiveLobbies,
} = require('../../lib/ihl');
const {
    createChallengeLobby,
} = require('../../lib/lobby');
const {
    findUserByDiscordId,
    getChallengeBetweenUsers,
    createChallenge,
    destroyChallengeBetweenUsers,
} = require('../../lib/db');

/**
 * @class ChallengeCommand
 * @extends IHLCommand
 */
module.exports = class ChallengeCommand extends IHLCommand {
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
        }, {
            lobbyState: false,
        });
    }

    async onMsg({ msg, guild, inhouseState, inhouseUser }, { member }) {
        logger.debug(`ChallengeCommand`);
        const giver = inhouseUser;
        // check if giver already in a lobby
        let inLobby = await hasActiveLobbies(giver);
        logger.debug(`ChallengeCommand inLobby ${inLobby}`);
        if (!inLobby) {
            const receiver = await findUserByDiscordId(guild.id)(member.id);
            logger.debug(`ChallengeCommand receiver ${receiver}`);
            if (receiver) {
                if (receiver.id !== giver.id) {
                    // check if receiver already in a lobby
                    inLobby = await hasActiveLobbies(receiver);
                    logger.debug(`ChallengeCommand receiver inLobby ${inLobby}`);
                    if (!inLobby) {
                        // check if giver has issued a challenge to this receiver already
                        const challengeFromGiver = await getChallengeBetweenUsers(giver)(receiver);
                        logger.debug(`ChallengeCommand challengeFromGiver ${challengeFromGiver}`);
                        if (challengeFromGiver) {
                            logger.debug(`ChallengeCommand ${member} already challenged.`);
                            await msg.say(`${member} already challenged.`);
                        }
                        else {
                            // check if receiver has issued a challenge to the giver already
                            const challengeFromReceiver = await getChallengeBetweenUsers(receiver)(giver);
                            logger.debug(`ChallengeCommand challengeFromReceiver ${challengeFromReceiver}`);
                            if (challengeFromReceiver) {
                                // accept receiver's challenge if not yet accepted
                                if (!challengeFromReceiver.accepted) {
                                    logger.debug(`ChallengeCommand challenge accepted.`);
                                    await createChallengeLobby({ inhouseState, captain_1: receiver, captain_2: giver, challenge: challengeFromReceiver });
                                    //await destroyChallengeBetweenUsers(receiver)(giver);
                                    await msg.say(`${msg.author} accepts challenge from ${member}.`);
                                }
                                else {
                                    await msg.say(`Challenge from ${member} already accepted.`);
                                }
                            }
                            else {
                                // issue new challenge
                                logger.debug(`ChallengeCommand createChallenge`);
                                logger.debug(`${msg.author} challenges ${member}.`);
                                const challenge = await createChallenge(giver)(receiver);
                                await msg.say(`${msg.author} challenges ${member}.`);
                            }
                        }
                    }
                    else {
                        await msg.say('The player you are challenging is already in a lobby.');
                    }
                }
                else {
                    await msg.say('Cannot challenge yourself.');
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
};
