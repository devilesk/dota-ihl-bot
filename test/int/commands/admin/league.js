const chai = require('chai');
const assert = chai.assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const sequelizeMockingMocha = require('sequelize-mocking').sequelizeMockingMocha;
const db = require('../../../../models');
const ihlManager = require('../../../../lib/ihlManagerStub');
const LeagueInfoCommand = proxyquire('../../../../commands/admin/league-info', {
    '../../lib/ihlManager': ihlManager,
});
const LeagueCreateCommand = proxyquire('../../../../commands/admin/league-create', {
    '../../lib/ihlManager': ihlManager,
});

describe('League Commands', () => {
    sequelizeMockingMocha(
        db.sequelize,
        [
            path.resolve(path.join(__dirname, '../../../../testdata/fake-leagues.js')),
            path.resolve(path.join(__dirname, '../../../../testdata/fake-seasons.js')),
            path.resolve(path.join(__dirname, '../../../../testdata/fake-users.js')),
            path.resolve(path.join(__dirname, '../../../../testdata/fake-bots.js')),
            path.resolve(path.join(__dirname, '../../../../testdata/fake-queues.js')),
            path.resolve(path.join(__dirname, '../../../../testdata/fake-lobbies.js')),
            path.resolve(path.join(__dirname, '../../../../testdata/fake-lobbyplayers.js')),
            path.resolve(path.join(__dirname, '../../../../testdata/fake-lobbyqueuers.js')),
            path.resolve(path.join(__dirname, '../../../../testdata/fake-challenges.js')),
        ],
        { logging: false },
    );
    
    const client = {
        isOwner: sinon.stub(),
    }

    describe('LeagueInfoCommand', () => {
        let cmd;
        beforeEach(async () => {
            cmd = new LeagueInfoCommand(client);
            ihlManager.isMessageFromAdmin.reset();
        });
        
        it('return hasPermission true', async () => {
            ihlManager.isMessageFromAdmin.returns(true);
            assert.isTrue(cmd.hasPermission());
        });
        
        it('return hasPermission false', async () => {
            ihlManager.isMessageFromAdmin.returns(false);
            assert.isFalse(cmd.hasPermission());
        });
        
        it('run', async () => {
            const send = sinon.stub();
            const msg = {
                channel: {
                    guild: {
                        id: '422549177151782925',
                    },
                    send
                }
            }
            await cmd.run(msg);
            assert.isTrue(send.calledOnce);
        });
    });

    describe('LeagueCreateCommand', () => {
        let cmd;
        let msg;
        beforeEach(async () => {
            cmd = new LeagueCreateCommand(client);
            client.isOwner.reset();
            msg = {
                channel: {
                    guild: {
                        id: '422549177151782925',
                    },
                    send: sinon.stub(),
                },
                author: 1,
                say: sinon.stub(),
            }
        });
        
        it.only('return hasPermission true', async () => {
            client.isOwner.returns(true);
            assert.isTrue(cmd.hasPermission(msg));
        });
        
        it.only('return hasPermission false', async () => {
            client.isOwner.returns(false);
            assert.isFalse(cmd.hasPermission(msg));
        });
        
        it.only('run create new league', async () => {
            ihlManager.getInhouseState.returns(false);
            await cmd.run(msg);
            assert.isTrue(msg.say.calledOnce);
            assert.isTrue(msg.say.calledWith('Inhouse league created.'));
        });
        
        it.only('run league exists', async () => {
            ihlManager.getInhouseState.returns(true);
            await cmd.run(msg);
            assert.isTrue(msg.say.calledOnce);
            assert.isTrue(msg.say.calledWith('Inhouse league already exists.'));
        });
    });
});
    
    