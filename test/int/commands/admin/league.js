const chai = require('chai');
const assert = chai.assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const path = require('path');
const sequelizeMockingMocha = require('sequelize-mocking').sequelizeMockingMocha;
const db = require('../../../../models');
const client = require('../../../../lib/client');
const ihlManager = require('../../../../lib/ihlManagerStub');
const LeagueInfoCommand = proxyquire('../../../../commands/admin/league-info', {
    '../../lib/ihlManager': ihlManager,
});
const LeagueCreateCommand = proxyquire('../../../../commands/admin/league-create', {
    '../../lib/ihlManager': ihlManager,
});
const LeagueSeasonCommand = proxyquire('../../../../commands/admin/league-season', {
    '../../lib/ihlManager': ihlManager,
});
const LeagueUpdateCommand = proxyquire('../../../../commands/admin/league-update', {
    '../../lib/ihlManager': ihlManager,
});
const {
    findLeague,
} = require('../../../../lib/db');

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
    
    const fakeClient = {
        isOwner: sinon.stub(),
    }
    let msg;
    beforeEach(async () => {
        ihlManager.isMessageFromAdmin.reset();
        fakeClient.isOwner.reset();
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

    describe('LeagueInfoCommand', () => {
        let cmd;
        beforeEach(async () => {
            cmd = new LeagueInfoCommand(fakeClient);
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
        beforeEach(async () => {
            cmd = new LeagueCreateCommand(fakeClient);
        });
        
        it('return hasPermission true', async () => {
            fakeClient.isOwner.returns(true);
            assert.isTrue(cmd.hasPermission(msg));
        });
        
        it('return hasPermission false', async () => {
            fakeClient.isOwner.returns(false);
            assert.isFalse(cmd.hasPermission(msg));
        });
        
        it('run create new league', async () => {
            ihlManager.getInhouseState.returns(false);
            await cmd.run(msg);
            assert.isTrue(msg.say.calledOnce);
            assert.isTrue(msg.say.calledWith('Inhouse league created.'));
        });
        
        it('run league exists', async () => {
            ihlManager.getInhouseState.returns(true);
            await cmd.run(msg);
            assert.isTrue(msg.say.calledOnce);
            assert.isTrue(msg.say.calledWith('Inhouse league already exists.'));
        });
    });

    describe('LeagueSeasonCommand', () => {
        let cmd;
        beforeEach(async () => {
            cmd = new LeagueSeasonCommand(fakeClient);
        });
        
        it('return hasPermission true', async () => {
            ihlManager.isMessageFromAdmin.returns(true);
            assert.isTrue(cmd.hasPermission(msg));
        });
        
        it('return hasPermission false', async () => {
            ihlManager.isMessageFromAdmin.returns(false);
            assert.isFalse(cmd.hasPermission(msg));
        });
        
        it('run create new season', async () => {
            const league_before = await findLeague(msg.channel.guild.id);
            await cmd.run(msg);
            const league_after = await findLeague(msg.channel.guild.id);
            assert.notEqual(league_before.current_season_id, league_after.current_season_id);
            assert.isTrue(msg.say.calledOnce);
            assert.isTrue(msg.say.calledWith('New league season started.'));
        });
    });

    describe('LeagueUpdateCommand', () => {
        let cmd;
        beforeEach(async () => {
            cmd = new LeagueUpdateCommand(client);
        });
        
        it('return isValidSetting true', async () => {
            assert.isTrue(LeagueUpdateCommand.isValidSetting('CaT_eGo_ry_name'));
        });
        
        it('return isValidSetting false', async () => {
            assert.isFalse(LeagueUpdateCommand.isValidSetting('test'));
        });
        
        it('return hasPermission true', async () => {
            ihlManager.isMessageFromAdmin.returns(true);
            assert.isTrue(cmd.hasPermission(msg));
        });
        
        it('return hasPermission false', async () => {
            ihlManager.isMessageFromAdmin.returns(false);
            assert.isFalse(cmd.hasPermission(msg));
        });
        
        it('run update league', async () => {
            const league_before = await findLeague(msg.channel.guild.id);
            const setting = 'categoryname';
            const value = 'test';
            await cmd.run(msg, { setting, value });
            const league_after = await findLeague(msg.channel.guild.id);
            assert.notEqual(league_before.category_name, league_after.category_name);
            assert.isTrue(msg.say.calledOnce);
            assert.isTrue(msg.say.calledWith(`League setting updated. ${setting} set to ${value}`));
        });
        
        it('run update league', async () => {
            const league_before = await findLeague(msg.channel.guild.id);
            const setting = 'categoryname';
            const value = 'test';
            await cmd.run(msg, { setting, value });
            const league_after = await findLeague(msg.channel.guild.id);
            assert.notEqual(league_before.category_name, league_after.category_name);
            assert.isTrue(msg.say.calledOnce);
            assert.isTrue(msg.say.calledWith(`League setting updated. ${setting} set to ${value}`));
        });
        
        it('run update league', async () => {
            const league_before = await findLeague(msg.channel.guild.id);
            const setting = 'categoryname';
            const value = 'test';
            await cmd.run(msg, { setting, value });
            const league_after = await findLeague(msg.channel.guild.id);
            assert.notEqual(league_before.category_name, league_after.category_name);
            assert.isTrue(msg.say.calledOnce);
            assert.isTrue(msg.say.calledWith(`League setting updated. ${setting} set to ${value}`));
        });
    });
});
    
    