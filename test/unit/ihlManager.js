require('../common.db');
require('../common');
const {
    findUser,
    loadInhouseStates,
    loadInhouseStatesFromLeagues,
    sendMatchStatsMessage,
    IHLManager,
    ihlManager,
} = require('../../lib/ihlManager');

describe('Database', () => {
    beforeEach((done) => {
        sequelize_fixtures.loadFiles([
            path.resolve(path.join(__dirname, '../../testdata/fake-leagues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-seasons.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-users.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-bots.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-queues.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbies.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbyplayers.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-lobbyqueuers.js')),
            path.resolve(path.join(__dirname, '../../testdata/fake-challenges.js')),
        ], db, { log: () => {} }).then(() => {
            done();
        });
    });

    describe('findUser', () => {
        it('return user matching discord id', async () => {
            const guild = {
                id: '422549177151782925',
                members: [],
            };
            guild.members.get = sinon.stub();
            guild.members.get.withArgs('76864899866697728').returns('discordUser');
            const [user, discordUser, resultType] = await findUser(guild)('<@76864899866697728>');
            assert.equal(user.id, 1);
            assert.equal(discordUser, 'discordUser');
            assert.equal(resultType, CONSTANTS.MATCH_EXACT_DISCORD_MENTION);
        });
        it('return user matching discord id nickname', async () => {
            const guild = {
                id: '422549177151782925',
                members: [],
            };
            guild.members.get = sinon.stub();
            guild.members.get.withArgs('76864899866697728').returns('discordUser');
            const [user, discordUser, resultType] = await findUser(guild)('<@!76864899866697728>');
            assert.equal(user.id, 1);
            assert.equal(discordUser, 'discordUser');
            assert.equal(resultType, CONSTANTS.MATCH_EXACT_DISCORD_MENTION);
        });

        it('return user matching discord name', async () => {
            const guild = {
                id: '422549177151782925',
                members: [
                    {
                        id: '112718237040398336',
                        displayName: 'Test',
                    },
                ],
            };
            const [user, discordUser, resultType] = await findUser(guild)('test');
            assert.equal(user.id, 2);
            assert.equal(discordUser.id, '112718237040398336');
            assert.equal(resultType, CONSTANTS.MATCH_EXACT_DISCORD_NAME);
        });
    });
});
