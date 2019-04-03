const chai = require('chai');
const assert = chai.assert;
const sinon = require('sinon');
const path = require('path');
const db = require('../../models');
const {
    transaction,
    lockUpdate,
    findAllLeagues,
    findAllActiveLobbies,
    findActiveLobbiesForUser,
    findAllInProgressLobbies,
    findAllEnabledQueues,
    findLeague,
    findOrCreateLeague,
    createSeason,
    findOrCreateBot,
    findOrCreateLobby,
    findOrCreateLobbyForGuild,
    findLobbyByName,
    findLobbyById,
    findBot,
    findAllUnassignedBot,
    findUnassignedBot,
    findUserById,
    findUserByDiscordId,
    findUserBySteamId64,
    findOrCreateUser,
    findOrCreateQueue,
    findLobbyByMatchId,
    updateLeague,
    updateLobbyState,
    updateLobby,
    updateLobbyName,
    updateBotStatusBySteamId,
    updateBotStatus,
    updateQueuesForUser,
    destroyQueueByName,
    findOrCreateReputation,
    destroyReputation,
    getChallengeBetweenUsers,
    createChallenge,
    destroyChallengeBetweenUsers,
    destroyAllAcceptedChallengeForUser,
    setChallengeAccepted,
} = require('../../lib/db');
const CONSTANTS = require('../../lib/constants');
const {
    getLobby,
    getPlayers,
} = require('../../lib/lobby');

describe('Database', () => {
    describe('transaction', () => {
        it('return leagues', async () => {
            let lobby1 = await findLobbyById(1);
            let players = await lobby1.getPlayers();
            console.log(players.length);
            await lobby1.destroy();
            players = await lobby1.getPlayers();
            console.log(players.length);
            lobby1 = await findLobbyById(1);
            console.log(lobby1);
        });
    });
});