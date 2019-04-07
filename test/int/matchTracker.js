const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const sequelizeMockingMocha = require('sequelize-mocking').sequelizeMockingMocha;
const EventEmitter = require('events').EventEmitter;
const db = require('../../models');
const {
    getOpenDotaMatchDetails,
    getValveMatchDetails,
    setMatchDetails,
    setMatchPlayerDetails,
    updatePlayerRatings,
    createMatchEndMessageEmbed,
    MatchTracker,
} = require('../../lib/matchTracker');
const {
    getLobby,
    getPlayers,
} = require('../../lib/lobby');
const CONSTANTS = require('../../lib/constants');

describe('Database', () => {
    sequelizeMockingMocha(
        db.sequelize,
        [
            path.resolve(path.join(__dirname, '../../testdata/int-matchTracker.js')),
        ],
        { logging: false },
    );
    
    describe('getOpenDotaMatchDetails', () => {
        it('return opendota match data', async () => {
            const data = await getOpenDotaMatchDetails('4578557761');
            assert.exists(data);
        });
        
        it('return bad opendota match data', async () => {
            const data = await getOpenDotaMatchDetails('aaaa4578aa557761aa');
            assert.isNull(data);
        });
    });
    
    describe('getValveMatchDetails', () => {
        it('return valve match data', async () => {
            const data = await getValveMatchDetails('4578557761');
            assert.exists(data);
        });
        
        it('return null valve match data', async () => {
            const data = await getValveMatchDetails('aaaa4578aa557761aa');
            assert.isNull(data);
        });
    });
    
    describe('setMatchDetails', () => {
        it('return lobby with opendota and valve match data', async () => {
            const lobby = await setMatchDetails({ id: 1 });
            assert.exists(lobby);
            assert.exists(lobby.odota_data);
        });
    });
    
    describe('setMatchPlayerDetails', () => {
        it('set lobby players match stats', async () => {
            let lobby = await setMatchDetails({ id: 1 });
            await setMatchPlayerDetails(lobby);
            const players = await getPlayers()(lobby);
            for (const player of players) {
                expect(player.LobbyPlayer.hero_id).to.be.a('number');
                expect(player.LobbyPlayer.kills).to.be.a('number');
                expect(player.LobbyPlayer.deaths).to.be.a('number');
                expect(player.LobbyPlayer.assists).to.be.a('number');
                expect(player.LobbyPlayer.gpm).to.be.a('number');
                expect(player.LobbyPlayer.xpm).to.be.a('number');
                assert.equal(player.LobbyPlayer.lose, player.LobbyPlayer.faction === 1);
                assert.equal(player.LobbyPlayer.win, player.LobbyPlayer.faction === 2);
            }
            lobby = await getLobby({ id: lobby.id });
            assert.equal(lobby.winner, 2);
        });
    });
    
    describe('updatePlayerRatings', () => {
        it('set lobby players match stats', async () => {
            let lobby = await setMatchDetails({ id: 1 });
            await setMatchPlayerDetails(lobby);
            await updatePlayerRatings({ id: 1 });
            const players = await getPlayers()(lobby);
            for (const player of players) {
                assert.equal(player.LobbyPlayer.lose, player.rating === 990);
                assert.equal(player.LobbyPlayer.win, player.rating === 1010);
            }
        });
    });
    
    describe('createMatchEndMessageEmbed', () => {
        it('return message embed', async () => {
            const lobby = await setMatchDetails({ id: 1 });
            const embed = await createMatchEndMessageEmbed(lobby.match_id);
            assert.exists(embed);
            assert.equal(embed.embed.fields[1].name, 'JBay7');
            assert.equal(embed.embed.fields[2].name, 'Sabo');
        });
    });
    
    describe('MatchTracker', () => {
        it('emit message embed', async () => {
            const matchTracker = new MatchTracker(1000);
            const lobby = await getLobby({ id: 1 });
            matchTracker.addLobby(lobby);
            const spy = sinon.spy();
            matchTracker.on(CONSTANTS.EVENT_MATCH_STATS, spy);
            await matchTracker.run();
            sinon.assert.calledOnce(spy);
            assert.empty(matchTracker.lobbies);
        });
        it('load lobbies in progress', async () => {
            const matchTracker = new MatchTracker(1000);
            await matchTracker.loadLobbies();
            assert.lengthOf(matchTracker.lobbies, 1);
        });
        it('add lobby', async () => {
            const matchTracker = new MatchTracker(1000);
            const lobby = await getLobby({ id: 1 });
            matchTracker.addLobby(lobby);
            assert.lengthOf(matchTracker.lobbies, 1);
        });
        it('do nothing when disabled', async () => {
            const matchTracker = new MatchTracker(1000);
            const lobby = await getLobby({ id: 1 });
            matchTracker.addLobby(lobby);
            const spy = sinon.spy();
            matchTracker.on(CONSTANTS.EVENT_MATCH_STATS, spy);
            matchTracker.disable();
            await matchTracker.run();
            sinon.assert.notCalled(spy);
            assert.lengthOf(matchTracker.lobbies, 1);
        });
        it('emit message embed after disable/enable', async () => {
            const matchTracker = new MatchTracker(1000);
            const lobby = await getLobby({ id: 1 });
            matchTracker.addLobby(lobby);
            const spy = sinon.spy();
            matchTracker.on(CONSTANTS.EVENT_MATCH_STATS, spy);
            matchTracker.disable();
            matchTracker.enable();
            await matchTracker.run();
            sinon.assert.calledOnce(spy);
            assert.empty(matchTracker.lobbies);
        });
    });
});