 /**
 * @module lobby
 */
 
 /**
 * @typedef module:lobby.LobbyState
 * @type {Object}
 * @property {external:Guild} guild - The discord guild the lobby belongs to.
 * @property {external:CategoryChannel} category - The discord inhouse category.
 * @property {external:GuildChannel} channel - The discord lobby channel.
 * @property {external:Role} role - The discord lobby role.
 * @property {number} ready_check_timeout - Duration in milliseconds before lobby ready timeout. 
 * @property {number} captain_rank_threshold - Maximum rank difference between captains. 
 * @property {string} captain_role_regexp - Regular expression string for captain roles.
 * @property {string} state - The lobby state.
 * @property {number} bot_id - The record id of the bot hosting the lobby.
 * @property {string} lobby_name - The lobby name.
 * @property {string} lobby_id - The in-game lobby id.
 * @property {string} password - The lobby password.
 * @property {string} captain_1 - The first captain steamid64.
 * @property {string} captain_2 - The second captain steamid64.
 * @property {string} match_id - The match id for the lobby.
 */
 
const util = require('util');
const Promise = require('bluebird');
const hri = require('human-readable-ids').hri;
const Sequelize = require('sequelize');
const { isDotaLobbyReady, DotaBot } = require('./dotaBot');

const Op = Sequelize.Op;
const logger = require('./logger');
const shuffle = require('./util/shuffle');
const combinations = require('./util/combinations');
const CONSTANTS = require('./constants');
const {
    findOrCreateChannelInCategory, findOrCreateRole, addRoleToUser, resolveUser,
} = require('./guild');
const {
    findLobby, findOrCreateLobbyForGuild, findBot, updateLobbyState, updateBotStatusBySteamId, updateBotStatus, updateQueueStatesByUserId, destroyQueuesByUserId, findAllUnassignedBot,
} = require('./db');
const {
    pipeP, mapPromise,
} = require('./util/fp');

const getLobby = async lobbyOrState => (lobbyOrState instanceof Sequelize.Model ? lobbyOrState : findLobby(lobbyOrState.lobby_name));

const getPlayers = options => async lobbyOrState => (await getLobby(lobbyOrState)).getPlayers(options);

const getPlayerBySteamId = lobbyOrState => async steamid_64 => (await getPlayers({ where: { steamid_64 } })(lobbyOrState))[0];

const getPlayerByDiscordId = lobbyOrState => async discord_id => (await getPlayers({ where: { discord_id } })(lobbyOrState))[0];

const getNoTeamPlayers = options => async lobbyOrState => (await getLobby(lobbyOrState)).getNoTeamPlayers(options);

const getNotReadyPlayers = options => async lobbyOrState => (await getLobby(lobbyOrState)).getNotReadyPlayers(options);

const getReadyPlayers = options => async lobbyOrState => (await getLobby(lobbyOrState)).getReadyPlayers(options);

const mapPlayers = fn => async lobbyOrState => pipeP(getPlayers(), mapPromise(fn))(lobbyOrState);

const addPlayer = lobbyOrState => async user => (await getLobby(lobbyOrState)).addPlayer(user);

const addPlayers = lobbyOrState => async users => mapPromise(addPlayer(lobbyOrState))(users);

const addRoleToPlayers = async lobbyState => mapPlayers(addRoleToUser(lobbyState.guild)(lobbyState.role))(lobbyState);

/*const setPlayers = options => lobby => async players => lobby.setPlayers(players, options);
const setLobbyPlayers = options => async lobby => pipeP(getPlayers(), setPlayers(options)(lobby))(lobby);
const setLobbyPlayersByLobbyName = options => pipeP(findLobby, setLobbyPlayers(options));
const setPlayersReady = value => setLobbyPlayersByLobbyName({ through: { ready: value } });*/

const updateLobbyPlayer = data => lobbyOrState => async (steamid_64) => {
    logger.debug(`updateLobbyPlayer ${lobbyOrState.lobby_name} ${steamid_64} ${util.inspect(data)}`);
    const [player] = await getPlayers({ where: { steamid_64 } })(lobbyOrState);
    return player.LobbyPlayer.update(data);
};

const setPlayerReady = ready => updateLobbyPlayer({ ready });
const setPlayerTeam = faction => updateLobbyPlayer({ faction });

const calcBalanceTeams = (playersWithRank) => {
    logger.debug('calcBalanceTeams');
    const combs = combinations(playersWithRank, 5);
    let best_weight_diff = 999999;
    let best_pairs = [];
    combs.forEach((comb) => {
        const team_1 = comb;
        const team_2 = playersWithRank.filter(i => comb.indexOf(i) < 0);
        const weight_1 = team_1.reduce((total, playerWithRank) => total + playerWithRank[1], 0);
        const weight_2 = team_2.reduce((total, playerWithRank) => total + playerWithRank[1], 0);
        const weight_diff = Math.abs(weight_1 - weight_2);
        if (weight_diff < best_weight_diff) {
            best_pairs = [[team_1, team_2]];
            best_weight_diff = weight_diff;
        }
        else if (weight_diff === best_weight_diff) {
            best_pairs.push([team_1, team_2]);
        }
    });
    shuffle(best_pairs);
    const best_pair = best_pairs.pop();
    logger.debug(`calcBalanceTeams done. ${best_pair.length}`);
    return best_pair.map(team => team.map(playerWithRank => playerWithRank[0]));
};

const setTeams = lobbyOrState => async ([team_1, team_2]) => {
    const lobby = await getLobby(lobbyOrState);
    return Promise.all([
        lobby.addPlayers(team_1, { through: { faction: 1 } }),
        lobby.addPlayers(team_2, { through: { faction: 2 } }),
    ]);
};

const selectCaptainPairFromTiers = captain_rank_threshold => (tiers) => {
    const keys = Object.keys(tiers).sort().reverse();
    // loop through tiers starting from highest tier
    for (const key of keys) {
        const tier = tiers[key];
        // only look at tiers with at least 2 players in them
        if (tier.length >= 2) {
            // get all possible pairs within the tier
            let combs = combinations(tier, 2);

            // filter out pairs that exceed skill difference threshold
            combs = combs.filter(([[, rank_tier_1], [, rank_tier_2]]) => Math.abs(rank_tier_1 - rank_tier_2) <= captain_rank_threshold);

            // select random pair
            shuffle(combs);

            return combs.pop();
        }
    }
    return [];
};

const sortPlayersByCaptainPriority = (playersWithCaptainPriority) => {
    const tiers = {};
    for (const [player, captain_priority, rank_tier] of playersWithCaptainPriority) {
        if (captain_priority !== -1) {
            tiers[captain_priority] = tiers[captain_priority] || [];
            tiers[captain_priority].push([player, rank_tier]);
        }
    }
    return tiers;
};

const getUserCaptainPriority = (guild, captain_role_regexp, user) => {
    const regexp = new RegExp(captain_role_regexp);
    let max_priority = -1;
    user.roles.forEach((role) => {
        const match = role.name.match(regexp);
        if (match) {
            const captain_priority = parseInt(match[1]);
            if (captain_priority > max_priority) {
                max_priority = captain_priority;
            }
        }
        logger.debug(`getUserCaptainPriority ${role.name} ${match} ${max_priority}`);
    });
    return max_priority;
};

const playerToCaptainPriority = guild => captain_role_regexp => async player => [player, getUserCaptainPriority(guild, captain_role_regexp, await resolveUser(guild, player)), player.rank_tier];
const getPlayersWithCaptainPriority = guild => captain_role_regexp => async lobbyOrState => mapPlayers(playerToCaptainPriority(guild)(captain_role_regexp))(lobbyOrState);

const assignCaptains = async lobbyOrState => pipeP(
    getPlayersWithCaptainPriority(lobbyOrState.guild)(lobbyOrState.captain_role_regexp),
    sortPlayersByCaptainPriority,
    selectCaptainPairFromTiers(lobbyOrState.captain_rank_threshold),
)(lobbyOrState);

const calcDefaultGameMode = (game_mode_preferences) => {
    const game_mode_totals = {};
    game_mode_preferences.forEach((game_mode_preference) => {
        game_mode_totals[game_mode_preference] = (game_mode_totals[game_mode_preference] || 0) + 1;
    });

    let best_count = -1;
    let best_game_mode = CONSTANTS.DOTA_GAMEMODE_CM;
    for (const [game_mode, count] of Object.entries(game_mode_totals)) {
        if (count > best_count) {
            best_count = count;
            best_game_mode = game_mode;
        }
    }

    logger.debug(`calcDefaultGameMode ${util.inspect(game_mode_totals)} ${best_count} ${best_game_mode}`);
    return best_game_mode;
};

const autoBalanceTeams = async lobbyOrState => pipeP(
    mapPlayers(player => [player, parseInt(player.rank_tier)]),
    calcBalanceTeams,
    setTeams(lobbyOrState),
)(lobbyOrState);

const getDefaultGameMode = async lobbyOrState => pipeP(
    mapPlayers(player => player.game_mode_preference),
    calcDefaultGameMode,
)(lobbyOrState);

const getDraftingFaction = async (lobbyOrState) => {
    const playersNoTeam = await getNoTeamPlayers()(lobbyOrState);
    const unassignedCount = playersNoTeam.length;
    if (unassignedCount === 0) {
        return 0;
    }
    return [8, 5, 4, 1].indexOf(unassignedCount) !== -1 ? 1 : 2;
};

const getFactionCaptain = lobbyOrState => async faction => (faction > 0 ? getPlayerBySteamId(lobbyOrState)([lobbyOrState.captain_1, lobbyOrState.captain_2][faction - 1]) : null);

const isPlayerDraftable = lobbyOrState => async (player) => {
    if (player.steamid_64 === lobbyOrState.captain_1 || player.steamid_64 === lobbyOrState.captain_2) {
        logger.debug(`isPlayerDraftable INVALID_DRAFT_CAPTAIN ${player.steamid_64} ${player.steamid_64 === lobbyOrState.captain_1} ${player.steamid_64 === lobbyOrState.captain_2}`);
        return CONSTANTS.INVALID_DRAFT_CAPTAIN;
    }
    if (player.faction !== 0) {
        logger.debug(`isPlayerDraftable INVALID_DRAFT_PLAYER ${player.steamid_64}`);
        return CONSTANTS.INVALID_DRAFT_PLAYER;
    }

    logger.debug(`isPlayerDraftable ${player.steamid_64} drafted to faction ${lobbyOrState.currentPick}`);
    await player.update({ faction: lobbyOrState.currentPick });
    return CONSTANTS.PLAYER_DRAFTED;
};

const isCaptain = lobbyOrState => async discord_id => (await getPlayers()(lobbyOrState)({
    discord_id,
    steamid_64: {
        [Op.in]: [lobbyOrState.captain_1, lobbyOrState.captain_2],
    },
}))[0];

const resetLobbyState = (state) => {
    switch (state) {
    case CONSTANTS.STATE_CHECKING_READY:
        return CONSTANTS.STATE_BEGIN_READY;
    case CONSTANTS.STATE_BOT_STARTED:
    case CONSTANTS.STATE_WAITING_FOR_PLAYERS:
        return CONSTANTS.WAITING_FOR_BOT;
    default:
        return state;
    }
};

const connectDotaBot = async (dotaBot) => {
    logger.debug(`connectDotaBot ${dotaBot.steamid_64}`);
    await dotaBot.connect();
    await updateBotStatusBySteamId(CONSTANTS.BOT_ONLINE)(dotaBot.steamid_64);
    return dotaBot;
};

const disconnectDotaBot = async (dotaBot) => {
    logger.debug(`disconnectDotaBot ${dotaBot.steamid_64}`);
    await dotaBot.disconnect();
    await updateBotStatusBySteamId(CONSTANTS.BOT_OFFLINE)(dotaBot.steamid_64);
    return dotaBot;
};

const createDotaBotLobby = lobbyState => async (dotaBot) => {
    logger.debug(`createDotaBotLobby ${lobbyState.lobby_name} ${lobbyState.pass_key} ${dotaBot.steamid_64}`);
    await dotaBot.createPracticeLobby({ game_name: lobbyState.lobby_name, pass_key: lobbyState.pass_key });
    logger.debug('createDotaBotLobby practice lobby created');
    await updateBotStatusBySteamId(CONSTANTS.BOT_IN_LOBBY)(dotaBot.steamid_64);
    logger.debug('createDotaBotLobby bot status updated');
    return dotaBot;
};

const joinDotaBotLobby = lobbyState => async (dotaBot) => {
    logger.debug(`joinDotaBotLobby ${lobbyState.lobby_name} ${lobbyState.pass_key}`);
    await dotaBot.joinPracticeLobby(lobbyState.lobby_id, { game_name: lobbyState.lobby_name, pass_key: lobbyState.pass_key });
    await updateBotStatusBySteamId(CONSTANTS.BOT_IN_LOBBY)(dotaBot.steamid_64);
    return dotaBot;
};

const reducePlayerToFactionCache = (_factionCache, player) => {
    logger.debug('reducePlayerToFactionCache');
    const factionCache = { ..._factionCache };
    factionCache[player.steamid_64] = player.LobbyPlayer.faction;
    return factionCache;
};

const setupLobbyBot = async (lobbyState) => {
    logger.debug(`setupLobbyBot ${lobbyState.lobby_name} ${lobbyState.bot_id} ${lobbyState.password}`);
    let dotaBot;
    try {
        await updateBotStatus(CONSTANTS.BOT_LOADING)(lobbyState.bot_id);
        const config = await findBot(lobbyState.bot_id);
        dotaBot = new DotaBot(config, true, false);
        await connectDotaBot(dotaBot);
        if (lobbyState.lobby_id) {
            await joinDotaBotLobby(lobbyState)(dotaBot);
        }
        else {
            await createDotaBotLobby(lobbyState)(dotaBot);
        }
        logger.debug('setupLobbyBot lobby created');
        const players = await getPlayers()(lobbyState);
        logger.debug(`setupLobbyBot getPlayers ${players.length}`);
        dotaBot.factionCache = players.reduce(reducePlayerToFactionCache, {});
        logger.debug('setupLobbyBot factionCache updated');
        return dotaBot;
    }
    catch (err) {
        logger.error('setupLobbyBot');
        if (dotaBot) {
            await disconnectDotaBot(dotaBot);
        }
        return null;
    }
};

const killLobby = async (_lobbyState) => {
    logger.debug('killLobby');
    const lobbyState = { ..._lobbyState };
    
    const ready_user_ids = await mapPromise(player => player.user_id)(getReadyPlayers()(lobbyState));
    const unready_user_ids = await mapPromise(player => player.user_id)(getNotReadyPlayers()(lobbyState));

    await updateQueueStatesByUserId(CONSTANTS.QUEUE_IN_QUEUE)(ready_user_ids);
    await destroyQueuesByUserId(unready_user_ids);

    if (lobbyState.channel) {
        logger.debug('killLobby channel delete');
        await lobbyState.channel.delete();
    }

    if (lobbyState.role) {
        logger.debug('killLobby role delete');
        await lobbyState.role.delete();
    }

    if (lobbyState.dotaBot) {
        logger.debug('killLobby bot delete');
        await disconnectDotaBot(lobbyState.dotaBot);
    }
    

    lobbyState.state = CONSTANTS.STATE_KILLED;
    lobbyState.channel = null;
    lobbyState.role = null;
    lobbyState.dotaBot = null;
    return lobbyState;
};

const isReadyCheckTimedOut = (ready_check_timeout, ready_check_time) => ready_check_time + ready_check_timeout < Date.now();

const reducePlayersToFactionCache = (players) => {
    const factionCache = {};
    players.forEach((player) => {
        factionCache[player.steamid_64] = player.LobbyPlayer.faction;
    });
    return factionCache;
};

const invitePlayer = dotaBot => async player => dotaBot.inviteToLobby(player.steamid_64);

const getUnassignedBot = async () => {
    logger.debug('getUnassignedBot');
    const bots = await findAllUnassignedBot();
    if (bots.length) {
        logger.debug(`getUnassignedBot assigned steamid_64 ${bots[0].steamid_64}`);
        return bots[0];
    }

    logger.debug('getUnassignedBot bot unavailable');
    return null;
};

const startLobby = async (lobbyState) => {
    logger.debug('startLobby');
    const lobbyData = await lobbyState.dotaBot.launchPracticeLobby();
    await lobbyState.dotaBot.leavePracticeLobby().then(() => {
        // TODO: check if this resolves
        lobbyState.dotaBot.abandonCurrentGame()
            .then(() => logger.debug('startLobby bot abandoned current game'))
            .catch(console.error);
    });
    await disconnectDotaBot(lobbyState.dotaBot);
    const user_ids = await mapPlayers(player => player.user_id)(lobbyState);
    await updateQueueStatesByUserId(CONSTANTS.QUEUE_IN_GAME)(user_ids);
    return lobbyData.match_id;
};

const getLobbyRole = guild => async (lobby_name) => {
    const role = await findOrCreateRole(guild, lobby_name);
    await role.setPermissions([]);
    await role.setMentionable(true);
    return role;
};

const loadLobby = async ({
    guild, category, lobby_name, ready_check_timeout, captain_rank_threshold, captain_role_regexp,
}) => {
    const lobby = await findOrCreateLobbyForGuild(guild.id, lobby_name);
    const channel = await findOrCreateChannelInCategory(guild, category, lobby_name);
    const role = await getLobbyRole(guild)(lobby_name);
    const state = await resetLobbyState(lobby.state);
    const lobbyState = {
        guild,
        category,
        channel,
        role,
        ready_check_timeout,
        captain_rank_threshold,
        captain_role_regexp,
        state,
        bot_id: lobby.bot_id,
        lobby_name: lobby.lobby_name,
        lobby_id: lobby.lobby_id,
        password: lobby.password,
        captain_1: lobby.captain_1,
        captain_2: lobby.captain_2,
        match_id: lobby.match_id,
    };
    await addRoleToPlayers(lobbyState);
    logger.debug(`loadLobby done ${lobby_name}`);
    updateLobbyState(lobbyState);
    return lobbyState;
};

const initLobby = async ({
    guild, category, ready_check_timeout, captain_rank_threshold, captain_role_regexp,
}) => {
    const lobby_name = hri.random();
    const lobby = await findLobby(lobby_name);
    if (!lobby) {
        logger.debug(`initLobby lobby_name ${lobby_name} not exists, creating`);
        return loadLobby({
            guild, category, lobby_name, ready_check_timeout, captain_rank_threshold, captain_role_regexp,
        });
    }

    logger.debug(`initLobby lobby_name ${lobby_name} exists, retrying`);
    return initLobby({
        guild, category, ready_check_timeout, captain_rank_threshold, captain_role_regexp,
    });
};

const LobbyStateHandlers = {
    [CONSTANTS.STATE_NEW]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        lobbyState.state = CONSTANTS.STATE_BEGIN_READY;
        lobbyState.game_mode = await getDefaultGameMode(lobbyState);
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_BEGIN_READY]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        if (!lobbyState.ready_check_time) {
            lobbyState.ready_check_time = Date.now();
            events.push(CONSTANTS.EVENT_READY_CHECK_START);
        }
        lobbyState.state = CONSTANTS.STATE_CHECKING_READY;
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_CHECKING_READY]: async (_lobbyState) => {
        let lobbyState = { ..._lobbyState };
        const events = [];
        const playersReady = await getReadyPlayers()(lobbyState);
        logger.debug(`runLobby playersReady ${playersReady.length}`);
        if (playersReady.length === 10) {
            lobbyState.state = CONSTANTS.STATE_ASSIGNING_CAPTAINS;
            events.push(CONSTANTS.EVENT_PLAYERS_READY);
        }
        else if (isReadyCheckTimedOut(lobbyState.ready_check_timeout, lobbyState.ready_check_time)) {
            events.push(CONSTANTS.EVENT_READY_CHECK_FAILED);
            lobbyState = await killLobby(lobbyState);
        }
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_ASSIGNING_CAPTAINS]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        if (!lobbyState.captain_1 || !lobbyState.captain_2) {
            const [captain_1, captain_2] = await assignCaptains(lobbyState);
            logger.debug(`lobby run assignCaptains captain_1 ${util.inspect(lobbyState.captain_1)} captain_2 ${util.inspect(lobbyState.captain_2)}`);
            lobbyState.state = (captain_1 && captain_2) ? CONSTANTS.STATE_CHOOSING_SIDE : CONSTANTS.STATE_AUTOBALANCING;
            lobbyState.captain_1 = captain_1 ? captain_1.steamid_64 : null;
            lobbyState.captain_2 = captain_2 ? captain_2.steamid_64 : null;
            events.push(CONSTANTS.EVENT_ASSIGNED_CAPTAINS);
        }
        else {
            logger.debug(`lobby run assignCaptains captains exist ${lobbyState.captain_1}, ${lobbyState.captain_2}`);
            lobbyState.state = CONSTANTS.STATE_CHOOSING_SIDE;
        }
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_CHOOSING_SIDE]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        await setPlayerTeam(1)(lobbyState)(lobbyState.captain_1);
        await setPlayerTeam(2)(lobbyState)(lobbyState.captain_2);
        lobbyState.state = CONSTANTS.STATE_DRAFTING_PLAYERS;
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_DRAFTING_PLAYERS]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        lobbyState.faction = getDraftingFaction(lobbyState);
        const lobbyPlayer = await getFactionCaptain(lobbyState);
        logger.debug(`lobby run playerDraft lobbyPlayer ${util.inspect(lobbyPlayer)}`);
        if (lobbyPlayer) {
            lobbyState.currentPick = lobbyPlayer.faction;
            events.push(CONSTANTS.EVENT_DRAFT_TURN);
        }
        else {
            lobbyState.state = CONSTANTS.STATE_TEAMS_SELECTED;
        }
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_AUTOBALANCING]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        events.push(CONSTANTS.EVENT_AUTOBALANCING);
        const playersNoTeam = await getNoTeamPlayers()(lobbyState);
        const unassignedCount = playersNoTeam.length;
        if (unassignedCount) {
            logger.debug('Autobalancing...');
            await autoBalanceTeams(lobbyState);
            logger.debug('Autobalancing... done');
        }
        lobbyState.state = CONSTANTS.STATE_TEAMS_SELECTED;
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_TEAMS_SELECTED]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
        events.push(CONSTANTS.EVENT_TEAMS_SELECTED);
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_WAITING_FOR_BOT]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        if (!lobbyState.bot_id) {
            const bot = await getUnassignedBot();
            if (bot) {
                logger.debug(`lobby run getUnassignedBot ${bot.steamid_64}`);
                lobbyState.state = CONSTANTS.STATE_BOT_ASSIGNED;
                lobbyState.bot_id = bot.id;
            }
            else {
                lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
                lobbyState.bot_id = null;
                lobbyState.lobby_id = null;
            }
        }
        else {
            lobbyState.state = CONSTANTS.STATE_BOT_ASSIGNED;
        }
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_BOT_ASSIGNED]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        const dotaBot = await setupLobbyBot(lobbyState);
        logger.debug(`lobby run setupLobbyBot dotaBot exists ${!!dotaBot}`);
        if (dotaBot) {
            lobbyState.dotaBot = dotaBot;
            lobbyState.lobby_id = dotaBot.lobby_id;
            lobbyState.state = CONSTANTS.STATE_BOT_STARTED;
        }
        else {
            lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
            lobbyState.bot_id = null;
            lobbyState.lobby_id = null;
        }
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_BOT_STARTED]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        lobbyState.state = CONSTANTS.STATE_WAITING_FOR_PLAYERS;
        await mapPlayers(invitePlayer(lobbyState.dotaBot))(lobbyState);
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_WAITING_FOR_PLAYERS]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        if (isDotaLobbyReady(lobbyState.dotaBot.factionCache, lobbyState.dotaBot.playerState)) {
            logger.debug('lobby run isDotaLobbyReady true');
            lobbyState.state = CONSTANTS.STATE_MATCH_IN_PROGRESS;
            lobbyState.match_id = await startLobby(lobbyState);
            lobbyState.bot_id = null;
            events.push(CONSTANTS.EVENT_LOBBY_STARTED);
            logger.debug(`lobby run lobby started match_id ${lobbyState.match_id}`);
        }
        else {
            logger.debug('lobby run isDotaLobbyReady false');
        }
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_MATCH_IN_PROGRESS]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        logger.debug('lobby run ending match');
        lobbyState.state = CONSTANTS.STATE_MATCH_ENDED;
        const user_ids = await mapPlayers(player => player.user_id)(lobbyState);
        await destroyQueuesByUserId(user_ids);
        logger.debug(`lobby run state ${lobbyState.state}`);
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_MATCH_ENDED]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        logger.debug('lobby run match ended');
        return { lobbyState, events };
    },
};

const runLobby = async (_lobbyState, eventEmitter) => {
    const { lobbyState, events } = await LobbyStateHandlers[_lobbyState.state](_lobbyState);
    logger.debug(`runLobby ${util.inspect(_lobbyState.state)} ${util.inspect(lobbyState.state)}`);
    events.forEach(event => eventEmitter.emit(event, lobbyState));
    if (lobbyState.state === CONSTANTS.STATE_BOT_STARTED) {
        lobbyState.dotaBot.on(CONSTANTS.EVENT_CHAT_MESSAGE, (channel, sender_name, message, chatData) => eventEmitter.emit(CONSTANTS.EVENT_CHAT_MESSAGE, lobbyState, channel, sender_name, message, chatData));
        lobbyState.dotaBot.on(CONSTANTS.EVENT_LOBBY_PLAYER_JOINED, member => eventEmitter.emit(CONSTANTS.EVENT_LOBBY_PLAYER_JOINED, lobbyState, member));
        lobbyState.dotaBot.on(CONSTANTS.EVENT_LOBBY_PLAYER_LEFT, member => eventEmitter.emit(CONSTANTS.EVENT_LOBBY_PLAYER_LEFT, lobbyState, member));
        lobbyState.dotaBot.on(CONSTANTS.EVENT_LOBBY_PLAYER_CHANGED_SLOT, state => eventEmitter.emit(CONSTANTS.EVENT_LOBBY_PLAYER_CHANGED_SLOT, lobbyState, state));
        lobbyState.dotaBot.on(CONSTANTS.EVENT_LOBBY_READY, () => eventEmitter.emit(CONSTANTS.EVENT_LOBBY_READY, lobbyState));
    }
    await updateLobbyState(lobbyState);
    if (lobbyState.state !== _lobbyState.state) {
        logger.debug('runLobby continue');
        return runLobby(lobbyState, eventEmitter);
    }

    logger.debug('runLobby stop');
    return lobbyState;
};

module.exports = {
    getLobby,
    getPlayers,
    getPlayerBySteamId,
    getPlayerByDiscordId,
    getNoTeamPlayers,
    getNotReadyPlayers,
    addRoleToPlayers,
    addPlayers,
    //setPlayers,
    mapPlayers,
    //setLobbyPlayers,
    //setLobbyPlayersByLobbyName,
    //setPlayersReady,
    setPlayerReady,
    setPlayerTeam,
    calcBalanceTeams,
    selectCaptainPairFromTiers,
    sortPlayersByCaptainPriority,
    setTeams,
    getUserCaptainPriority,
    assignCaptains,
    calcDefaultGameMode,
    autoBalanceTeams,
    getDefaultGameMode,
    getDraftingFaction,
    getFactionCaptain,
    isPlayerDraftable,
    isCaptain,
    resetLobbyState,
    updateLobbyState,
    connectDotaBot,
    disconnectDotaBot,
    createDotaBotLobby,
    setupLobbyBot,
    killLobby,
    isReadyCheckTimedOut,
    reducePlayersToFactionCache,
    getUnassignedBot,
    startLobby,
    loadLobby,
    initLobby,
    runLobby,
    LobbyStateHandlers,
};
