require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
const chai = require('chai');

const { assert } = chai;
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
            await lobby1.destroy();
            players = await lobby1.getPlayers();
            console.log(players.length);
            lobby1 = await findLobbyById(1);
            console.log(lobby1);
        });
        it('return leagues', async () => {
            Object.values(db.sequelize.models).map((model) => {
                model.truncate({
                    cascade: true,
                    restartIdentity: true,
                });
            });
        });
        it('return leagues', async () => {
            const league = await findOrCreateLeague('test')([
                { queueType: CONSTANTS.QUEUE_TYPE_DRAFT, queueName: 'player-draft-queue' },
                { queueType: CONSTANTS.QUEUE_TYPE_AUTO, queueName: 'autobalanced-queue' },
            ]);
            const season = await league.getCurrentSeason();
            console.log(season.id);
            let ticket = await league.getCurrentTicket();
            console.log(ticket);
            await db.Ticket.create({ leagueId: 1, leagueid: 2, name: 'test', startTimestamp: Date.now(), endTimestamp: Date.now() });
            await league.update({ currentTicketId: 1 });
            ticket = await league.getCurrentTicket();
            console.log(ticket);
        });
    });
});
