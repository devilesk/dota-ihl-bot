const IHLCommand = require('../../lib/ihlCommand');
const {
    hasActiveLobbies,
} = require('../../lib/ihl');
const {
    findUserByDiscordId,
    getChallengeBetweenUsers,
    createChallenge,
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
        const giver = inhouseUser;
        // check if giver already in a lobby
        let inLobby = await hasActiveLobbies(giver);
        if (!inLobby) {
            const receiver = await findUserByDiscordId(guild)(member.id);
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
                                await this.ihlManager.createChallengeLobby(inhouseState, challengeFromReceiver, receiver, giver);
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
};
