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
    loadInhouseStates,
    loadInhouseStatesFromLeagues,
    sendMatchEndMessage,
    IHLManager,
    ihlManager,
} = proxyquire('../../lib/ihlManager', {
    './guild': require('../../lib/guildStub'),
});
const CONSTANTS = require('../../lib/constants');
const dotenv = require('dotenv').config();

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
});