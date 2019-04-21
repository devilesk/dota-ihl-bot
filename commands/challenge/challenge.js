const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Ihl = require('../../lib/ihl');
const Db = require('../../lib/db');

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
                },
            ],
        }, { lobbyState: false });
    }

    async onMsg({ msg, guild, inhouseState, inhouseUser }, { member }) {
        logger.silly('ChallengeCommand');
        const giver = inhouseUser;
        // check if giver already in a lobby
        let inLobby = await Ihl.hasActiveLobbies(giver);
        logger.silly(`ChallengeCommand inLobby ${inLobby}`);
        if (!inLobby) {
            const receiver = await Db.findUserByDiscordId(guild.id)(member.id);
            logger.silly(`ChallengeCommand receiver ${receiver}`);
            if (receiver) {
                if (receiver.id !== giver.id) {
                    // check if receiver already in a lobby
                    inLobby = await Ihl.hasActiveLobbies(receiver);
                    logger.silly(`ChallengeCommand receiver inLobby ${inLobby}`);
                    if (!inLobby) {
                        // check if giver has issued a challenge to this receiver already
                        const challengeFromGiver = await Db.getChallengeBetweenUsers(giver)(receiver);
                        logger.silly(`ChallengeCommand challengeFromGiver ${challengeFromGiver}`);
                        if (challengeFromGiver) {
                            logger.silly(`ChallengeCommand ${member} already challenged.`);
                            return msg.say(`${member} already challenged.`);
                        }
                        // check if receiver has issued a challenge to the giver already
                        const challengeFromReceiver = await Db.getChallengeBetweenUsers(receiver)(giver);
                        logger.silly(`ChallengeCommand challengeFromReceiver ${challengeFromReceiver}`);
                        if (challengeFromReceiver) {
                            // accept receiver's challenge if not yet accepted
                            if (!challengeFromReceiver.accepted) {
                                logger.silly('ChallengeCommand challenge accepted.');
                                await this.ihlManager.createChallengeLobby(inhouseState, receiver, giver, challengeFromReceiver);
                                return msg.say(`${msg.author} accepts challenge from ${member}.`);
                            }
                            return msg.say(`Challenge from ${member} already accepted.`);
                        }
                        // issue new challenge
                        logger.silly('ChallengeCommand createChallenge');
                        logger.silly(`${msg.author} challenges ${member}.`);
                        await Db.createChallenge(giver)(receiver);
                        return msg.say(`${msg.author} challenges ${member}.`);
                    }
                    return msg.say('The player you are challenging is already in a lobby.');
                }
                return msg.say('Cannot challenge yourself.');
            }
            return msg.say('Challenged user not found.');
        }
        return msg.say('Cannot challenge while you are in a lobby.');
    }
};
