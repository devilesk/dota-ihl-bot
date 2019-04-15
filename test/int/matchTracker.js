require('../common');
const MatchTracker = require('../../lib/matchTracker');
const Lobby = require('../../lib/lobby');
const Db = require('../../lib/db');

const nockBack = require('nock').back;
nockBack.fixtures = 'test/fixtures/';
nockBack.setMode('record');

describe('Database', () => {
    let guild;
    let matchTracker;
    
    before(async () => {
        ({ nockDone} = await nockBack('int_matchTracker.json'));
    });
    
    beforeEach(async () => {
        guild = new Mocks.MockGuild();
        await guild.toDatabase();
        const playerData = [
            {
                steamid_64: '76561198141833531',
                nickname: 'Magnus',
                rating: 1000,
            },
            {
                steamid_64: '76561198002069391',
                nickname: 'Troll Warlord',
                rating: 1000,
            },
            {
                steamid_64: '76561198007202563',
                nickname: 'Arc Warden',
                rating: 1000,
            },
            {
                steamid_64: '76561198056207790',
                nickname: 'Lion',
                rating: 1000,
            },
            {
                steamid_64: '76561198006744028',
                nickname: 'Jakiro',
                rating: 1000,
            },
            {
                steamid_64: '76561198053292860',
                nickname: 'Witch Doctor',
                rating: 1000,
            },
            {
                steamid_64: '76561198084283419',
                nickname: 'Chaos Knight',
                rating: 1000,
            },
            {
                steamid_64: '76561198132465299',
                nickname: 'Juggernaut',
                rating: 1000,
            },
            {
                steamid_64: '76561198015512690',
                nickname: 'Winter Wyvern',
                rating: 1000,
            },
            {
                steamid_64: '76561198085487944',
                nickname: 'Earthshaker',
                rating: 1000,
            }
        ];
        for (let i = 0; i < 10; i++) {
            const member = new Mocks.MockMember(guild);
            await member.toGuild(guild).toDatabase(playerData[i]);
        }
        const lobby = await Db.findOrCreateLobbyForGuild(guild.id, CONSTANTS.QUEUE_TYPE_AUTO, 'autobalanced-queue');
        for (const member of guild.members.array()) {
            await Lobby.addPlayer(lobby)(member._model);
        }
        await lobby.update({
            match_id: '4578557761',
            state: CONSTANTS.STATE_MATCH_IN_PROGRESS,
            captain_1_user_id: guild.members.array()[0]._model.id,
            captain_2_user_id: guild.members.array()[5]._model.id,
        });
        for (let i = 0; i < 5; i++) {
            await Lobby.setPlayerFaction(1)(lobby)(guild.members.array()[i]._model.id);
        }
        for (let i = 5; i < 10; i++) {
            await Lobby.setPlayerFaction(2)(lobby)(guild.members.array()[i]._model.id);
        }
        matchTracker = new MatchTracker.MatchTracker(1000);
    });

    after(async () => {
        await nockDone();
    });
    
    describe('getOpenDotaMatchDetails', () => {
        it('return opendota match data', async () => {
            const data = await MatchTracker.getOpenDotaMatchDetails('4578557761');
            assert.exists(data);
        });
        
        it('return bad opendota match data', async () => {
            const data = await MatchTracker.getOpenDotaMatchDetails('aaaa4578aa557761aa');
            assert.isNull(data);
        });
    });
    
    describe('getValveMatchDetails', () => {
        it('return valve match data', async () => {
            const data = await MatchTracker.getValveMatchDetails('4578557761');
            assert.exists(data);
        });
        
        it('return null valve match data', async () => {
            const data = await MatchTracker.getValveMatchDetails('aaaa4578aa557761aa');
            assert.isNull(data);
        });
    });
    
    describe('setMatchDetails', () => {
        it('return lobby with opendota and valve match data', async () => {
            const lobby = await MatchTracker.setMatchDetails({ id: 1 });
            assert.exists(lobby);
            assert.exists(lobby.odota_data);
        });
    });
    
    describe('setMatchPlayerDetails', () => {
        it('set lobby players match stats', async () => {
            let lobby = await MatchTracker.setMatchDetails({ id: 1 });
            await MatchTracker.setMatchPlayerDetails(lobby);
            const players = await Lobby.getPlayers()(lobby);
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
            lobby = await Lobby.getLobby({ id: lobby.id });
            assert.equal(lobby.winner, 2);
        });
    });
    
    describe('updatePlayerRatings', () => {
        it('set lobby players match stats', async () => {
            let lobby = await MatchTracker.setMatchDetails({ id: 1 });
            await MatchTracker.setMatchPlayerDetails(lobby);
            await MatchTracker.updatePlayerRatings({ id: 1 });
            const players = await Lobby.getPlayers()(lobby);
            for (const player of players) {
                assert.equal(player.LobbyPlayer.lose, player.rating === 990);
                assert.equal(player.LobbyPlayer.win, player.rating === 1010);
            }
        });
    });
    
    describe('createMatchEndMessageEmbed', () => {
        it('return message embed', async () => {
            const lobby = await MatchTracker.setMatchDetails({ id: 1 });
            const embed = await MatchTracker.createMatchEndMessageEmbed(lobby.match_id);
            assert.exists(embed);
            assert.equal(embed.embed.fields[1].name, 'JBay7');
            assert.equal(embed.embed.fields[2].name, 'Sabo');
        });
    });
    
    describe('MatchTracker', () => {
        it('emit message embed', async () => {
            const lobby = await Lobby.getLobby({ id: 1 });
            matchTracker.addLobby(lobby);
            const spy = sinon.spy();
            matchTracker.on(CONSTANTS.EVENT_MATCH_STATS, spy);
            await matchTracker.run();
            sinon.assert.calledOnce(spy);
            assert.empty(matchTracker.lobbies);
        });
        it('load lobbies in progress', async () => {
            await matchTracker.loadLobbies();
            assert.lengthOf(matchTracker.lobbies, 1);
        });
        it('add lobby', async () => {
            const lobby = await Lobby.getLobby({ id: 1 });
            matchTracker.addLobby(lobby);
            assert.lengthOf(matchTracker.lobbies, 1);
        });
        it('do nothing when disabled', async () => {
            const lobby = await Lobby.getLobby({ id: 1 });
            matchTracker.addLobby(lobby);
            const spy = sinon.spy();
            matchTracker.on(CONSTANTS.EVENT_MATCH_STATS, spy);
            matchTracker.disable();
            await matchTracker.run();
            sinon.assert.notCalled(spy);
            assert.lengthOf(matchTracker.lobbies, 1);
        });
        it('emit message embed after disable/enable', async () => {
            const lobby = await Lobby.getLobby({ id: 1 });
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