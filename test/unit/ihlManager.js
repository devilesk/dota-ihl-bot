const chai = require('chai');
const assert = chai.assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const sequelizeMockingMocha = require('sequelize-mocking').sequelizeMockingMocha;
const EventEmitter = require('events').EventEmitter;
const db = require('../../models');
const {
    findUser,
    getInhouseState,
    getIndexOfInhouseState,
    addInhouseState,
    loadInhouseStates,
    loadInhouseStatesFromLeagues,
    getLobbyByChannelId,
    isMessageFromAnyInhouse,
    isMessageFromAnyInhouseAdmin,
    isMessageFromAnyInhouseLobby,
    isMessageFromLobby,
    getLobbyFromMessage,
    sendMatchEndMessage,
    initLeague,
    IHLManager,
    ihlManager,
} = proxyquire('../../lib/ihlManager', {
    './guild': require('../../lib/guildStub'),
});
const CONSTANTS = require('../../lib/constants');

describe('Database', () => {
    sequelizeMockingMocha(
        db.sequelize,
        [
            path.resolve(path.join(__dirname, '../../testdata/fake-leagues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-seasons.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-users.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-bots.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-queues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbies.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbyplayers.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbyqueuers.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-challenges.js')),
        ],
        { logging: false },
    );
    
    describe('findUser', () => {
        it('return user matching discord id', async () => {
            const guild = {
                id: '422549177151782925',
                members: [],
            }
            guild.members.get = sinon.stub();
            guild.members.get.withArgs('76864899866697728').returns('discord_user');
            const [user, discord_user, result_type] = await findUser(guild)('<@76864899866697728>');
            assert.equal(user.id, 1);
            assert.equal(discord_user, 'discord_user');
            assert.equal(result_type, CONSTANTS.MATCH_EXACT_DISCORD_MENTION);
        });
        
        it('return user matching discord name', async () => {
            const guild = {
                id: '422549177151782925',
                members: [
                    {
                        id: '112718237040398336',
                        displayName: 'Test',
                    }
                ],
            }
            const [user, discord_user, result_type] = await findUser(guild)('test');
            assert.equal(user.id, 2);
            assert.equal(discord_user.id, '112718237040398336');
            assert.equal(result_type, CONSTANTS.MATCH_EXACT_DISCORD_NAME);
        });
    });
    
    describe('getInhouseState', () => {
        it('return inhouse state matching guild id', async () => {
            const inhouseState = {guild: {id: '123'}};
            const inhouseStates = [inhouseState];
            assert.deepEqual(getInhouseState(inhouseStates, '123'), inhouseState);
        });
        
        it('return undefined', async () => {
            const inhouseState = {guild: {id: '123'}};
            const inhouseStates = [inhouseState];
            assert.isUndefined(getInhouseState(inhouseStates, '456'));
        });
    });
    
    describe('getIndexOfInhouseState', () => {
        it('return 0', async () => {
            const inhouseState = {guild: {id: '123'}};
            const inhouseStates = [inhouseState];
            assert.equal(getIndexOfInhouseState(inhouseStates, '123'), 0);
        });
        
        it('return 1', async () => {
            const inhouseState = {guild: {id: '123'}};
            const inhouseStates = [{guild: {id: '456'}}, inhouseState];
            assert.equal(getIndexOfInhouseState(inhouseStates, '123'), 1);
        });
        
        it('return -1', async () => {
            const inhouseState = {guild: {id: '123'}};
            const inhouseStates = [inhouseState];
            assert.equal(getIndexOfInhouseState(inhouseStates, '456'), -1);
        });
    });
    
    describe('addInhouseState', () => {
        it('return inhouse states with length 2 and inhouseState at end', async () => {
            const inhouseState = {guild: {id: '123'}};
            let inhouseStates = [{guild: {id: '456'}}];
            inhouseStates = addInhouseState(inhouseStates, inhouseState);
            assert.lengthOf(inhouseStates, 2);
            assert.notDeepEqual(inhouseStates[0], inhouseState);
            assert.deepEqual(inhouseStates[1], inhouseState);
        });
        
        it('return inhouseStates with length 3 and inhouseState at end', async () => {
            const inhouseState = {guild: {id: '123'}};
            let inhouseStates = [{guild: {id: 'a'}}, {guild: {id: '123'}}, {guild: {id: '456'}}];
            inhouseStates = addInhouseState(inhouseStates, inhouseState);
            assert.lengthOf(inhouseStates, 3);
            assert.notDeepEqual(inhouseStates[0], inhouseState);
            assert.notDeepEqual(inhouseStates[1], inhouseState);
            assert.deepEqual(inhouseStates[2], inhouseState);
        });
    });
    
    describe('loadInhouseStates', () => {
        // TODO
    });
    
    describe('getLobbyByChannelId', () => {
        it('return array of lobby and inhouse state', async () => {
            const lobby = {channel: {id: 1}};
            const inhouse = {
                lobbies: [lobby],
                guild: {id: '123'}
            };
            const inhouseStates = [inhouse];
            const [lobbyState, inhouseState] = getLobbyByChannelId(inhouseStates, '123', 1);
            assert.deepEqual(inhouse, inhouseState);
            assert.deepEqual(lobby, lobbyState);
        });
        
        it('return array of null lobby and inhouse state', async () => {
            const lobby = {channel: {id: 2}};
            const inhouse = {
                lobbies: [lobby],
                guild: {id: '123'}
            };
            const inhouseStates = [inhouse];
            const [lobbyState, inhouseState] = getLobbyByChannelId(inhouseStates, '123', 1);
            assert.deepEqual(inhouse, inhouseState);
            assert.isNull(lobbyState);
        });
        
        it('return array of null lobby and inhouse state when lobbies empty', async () => {
            const inhouse = {
                lobbies: [],
                guild: {id: '123'}
            };
            const inhouseStates = [inhouse];
            const [lobbyState, inhouseState] = getLobbyByChannelId(inhouseStates, '123', 1);
            assert.deepEqual(inhouse, inhouseState);
            assert.isNull(lobbyState);
        });
        
        it('return array of null lobby and null inhouse state', async () => {
            const lobby = {channel: {id: 1}};
            const inhouse = {
                lobbies: [lobby],
                guild: {id: '123'}
            };
            const inhouseStates = [inhouse];
            const [lobbyState, inhouseState] = getLobbyByChannelId(inhouseStates, '456', 1);
            assert.isNull(inhouseState);
            assert.isNull(lobbyState);
        });
        
        it('return array of null lobby and null inhouse state when inhouseStates is empty', async () => {
            const inhouseStates = [];
            const [lobbyState, inhouseState] = getLobbyByChannelId(inhouseStates, '456', 1);
            assert.isNull(inhouseState);
            assert.isNull(lobbyState);
        });
    });
});