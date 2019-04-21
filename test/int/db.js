require('../common');
const Ihl = require('../../lib/ihl');
const Db = require('../../lib/db');

describe('Database', () => {
    describe('Bot Functions', () => {
        let ticket1;
        let league1;
        let league2;
        let bot1;
        let bot2;
        let bot3;
        let bot4;
        let lobby1;
        let lobby2;
        let lobby3;

        beforeEach(async () => {
            ticket1 = await Db.upsertTicket({
                leagueid: 10,
                name: 'Ticket1',
                start_timestamp: Date.now(),
            });
            ticket2 = await Db.upsertTicket({
                leagueid: 11,
                name: 'Ticket2',
                start_timestamp: Date.now(),
            });
            league1 = await Ihl.initLeague({ id: '123' });
            league2 = await Ihl.initLeague({ id: '456' });
            let created;
            ([bot1, created] = await Db.findOrCreateBot('1', 'bot1', 'bot1', 'pass'));
            ([bot2, created] = await Db.findOrCreateBot('2', 'bot2', 'bot2', 'pass'));
            ([bot3, created] = await Db.findOrCreateBot('3', 'bot3', 'bot3', 'pass'));
            ([bot4, created] = await Db.findOrCreateBot('4', 'bot4', 'bot4', 'pass'));
            lobby1 = await Db.findOrCreateLobby(league1, 'queue_type', 'lobby_name1');
            lobby2 = await Db.findOrCreateLobby(league1, 'queue_type', 'lobby_name2');
            lobby3 = await Db.findOrCreateLobby(league2, 'queue_type', 'lobby_name3');
        });

        it('findAllUnassignedBotForLeagueTicket', async () => {
            let bots = await Db.findAllUnassignedBotForLeagueTicket(league1);
            assert.empty(bots);
            await Db.addTicketOf(bot1)(ticket1);
            await Db.updateLeague(league1.guild_id)({ leagueid: ticket1.leagueid });
            await league1.reload();
            bots = await Db.findAllUnassignedBotForLeagueTicket(league1);
            assert.lengthOf(bots, 1);
            await Db.addTicketOf(bot2)(ticket1);
            bots = await Db.findAllUnassignedBotForLeagueTicket(league1);
            assert.lengthOf(bots, 2);
            await bot1.update({ lobby_count: 4 });
            bots = await Db.findAllUnassignedBotForLeagueTicket(league1);
            assert.lengthOf(bots, 2);
            await bot1.update({ lobby_count: 5 });
            bots = await Db.findAllUnassignedBotForLeagueTicket(league1);
            assert.lengthOf(bots, 1);
            await bot2.update({ status: CONSTANTS.BOT_IDLE });
            bots = await Db.findAllUnassignedBotForLeagueTicket(league1);
            assert.lengthOf(bots, 1);
            await bot2.update({ status: CONSTANTS.BOT_ONLINE });
            bots = await Db.findAllUnassignedBotForLeagueTicket(league1);
            assert.empty(bots);
        });

        it('findAllUnassignedBotWithNoTicket', async () => {
            let bots = await Db.findAllUnassignedBotWithNoTicket();
            assert.lengthOf(bots, 4);
            await Db.addTicketOf(bot1)(ticket1);
            bots = await Db.findAllUnassignedBotWithNoTicket();
            assert.lengthOf(bots, 3);
            await bot1.update({ lobby_count: 0 });
            bots = await Db.findAllUnassignedBotWithNoTicket();
            assert.lengthOf(bots, 3);
            await bot3.update({ status: CONSTANTS.BOT_IDLE });
            bots = await Db.findAllUnassignedBotWithNoTicket();
            assert.lengthOf(bots, 3);
            await bot3.update({ status: CONSTANTS.BOT_ONLINE });
            bots = await Db.findAllUnassignedBotWithNoTicket();
            assert.lengthOf(bots, 2);
        });

        it('findUnassignedBot', async () => {
            let bot = await Db.findUnassignedBot(league1);
            assert.exists(bot);
            assert.equal(bot.id, 1);
            await Db.updateLeague(league1.guild_id)({ leagueid: ticket1.leagueid });
            await league1.reload();
            bot = await Db.findUnassignedBot(league1);
            assert.notExists(bot);
            await Db.addTicketOf(bot1)(ticket1);
            bot = await Db.findUnassignedBot(league1);
            assert.exists(bot);
            assert.equal(bot.id, 1);
        });
    });

    describe('Leaderboard', () => {
        let league; let user1; let user2; let user3; let
            user4;

        beforeEach(async () => {
            league = await Ihl.initLeague({ id: '123' });
            user1 = await Db.findOrCreateUser(league, '123', '123', 50);
            user2 = await Db.findOrCreateUser(league, '456', '456', 50);
            user3 = await Db.findOrCreateUser(league, '789', '789', 50);
            user4 = await Db.findOrCreateUser(league, '111', '111', 50);
            await db.Leaderboard.create({ league_id: league.id, season_id: 1, user_id: user1.id, rating: 1000, wins: 1, losses: 0 });
            await db.Leaderboard.create({ league_id: league.id, season_id: 1, user_id: user2.id, rating: 1100, wins: 2, losses: 0 });
            await db.Leaderboard.create({ league_id: league.id, season_id: 1, user_id: user3.id, rating: 1200, wins: 3, losses: 0 });
            await db.Leaderboard.create({ league_id: league.id, season_id: 1, user_id: user4.id, rating: 1200, wins: 3, losses: 0 });
        });

        it('queryUserLeaderboardRank', async () => {
            const rank1 = await Db.queryUserLeaderboardRank(league.id)(1)(user1.id);
            const rank2 = await Db.queryUserLeaderboardRank(league.id)(1)(user2.id);
            const rank3 = await Db.queryUserLeaderboardRank(league.id)(1)(user3.id);
            const rank4 = await Db.queryUserLeaderboardRank(league.id)(1)(user4.id);
            assert.equal(rank1, 4);
            assert.equal(rank2, 3);
            assert.equal(rank3, 1);
            assert.equal(rank4, 1);
        });
        it('queryLeaderboardRank', async () => {
            let rows = await Db.queryLeaderboardRank(league.id)(1)(1);
            assert.lengthOf(rows, 1);
            rows = await Db.queryLeaderboardRank(league.id)(1)(2);
            assert.lengthOf(rows, 2);
            rows = await Db.queryLeaderboardRank(league.id)(1)(4);
            assert.lengthOf(rows, 4);
            assert.equal(rows[3].rank, 4);
            assert.equal(rows[2].rank, 3);
            assert.equal(rows[1].rank, 1);
            assert.equal(rows[0].rank, 1);
        });
    });

    describe('upsetTicket', () => {
        it('insert ticket', async () => {
            let ticket = await Db.upsertTicket({
                leagueid: 1,
                name: 'Ticket',
            });
            assert.equal(ticket.id, 1);
            assert.equal(ticket.name, 'Ticket');
            assert.notExists(ticket.start_timestamp);
            ticket = await Db.upsertTicket({
                leagueid: 1,
                name: 'Name',
                start_timestamp: Date.now(),
            });
            assert.equal(ticket.id, 1);
            assert.equal(ticket.name, 'Name');
            assert.exists(ticket.start_timestamp);
        });
    });

    describe('Ticket associations', () => {
        let ticket;

        beforeEach(async () => {
            ticket = await Db.upsertTicket({
                leagueid: 12,
                name: 'Ticket',
                start_timestamp: Date.now(),
            });
        });

        describe('League', () => {
            let league;

            beforeEach(async () => {
                league = await Ihl.initLeague({ id: '123' });
            });

            it('getCurrentTicket', async () => {
                let current_ticket = await league.getCurrentTicket();
                assert.notExists(current_ticket);
                await Db.updateLeague(league.guild_id)({ leagueid: ticket.leagueid });
                await league.reload();
                current_ticket = await league.getCurrentTicket();
                assert.exists(current_ticket);
                assert.equal(current_ticket.id, 1);
                assert.equal(current_ticket.leagueid, 12);
            });

            it('addTicketOf', async () => {
                let tickets = await league.getTickets();
                assert.empty(tickets);
                await Db.addTicketOf(league)(ticket);
                tickets = await league.getTickets();
                assert.lengthOf(tickets, 1);
            });
        });

        describe('Bot', () => {
            let bot;
            let created;

            beforeEach(async () => {
                ([bot, created] = await Db.findOrCreateBot('123', 'bot3', 'bot3', 'pass'));
            });

            it('addTicketOf', async () => {
                let tickets = await bot.getTickets();
                assert.empty(tickets);
                await Db.addTicketOf(bot)(ticket);
                tickets = await bot.getTickets();
                assert.lengthOf(tickets, 1);
            });
        });
    });
});
