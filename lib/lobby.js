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
 * @property {number} ready_check_time - Start of lobby ready timer. 
 * @property {string} state - The lobby state.
 * @property {number} bot_id - The record id of the bot hosting the lobby.
 * @property {string} queue_type - The lobby queue type.
 * @property {string} lobby_name - The lobby name.
 * @property {string} lobby_id - The in-game lobby id.
 * @property {string} password - The lobby password.
 * @property {string} captain_1_user_id - The first captain user record id.
 * @property {string} captain_2_user_id - The second captain user record id.
 * @property {string} match_id - The match id for the lobby.
 */
 
const util = require('util');
const Promise = require('bluebird');
const hri = require('human-readable-ids').hri;
const Sequelize = require('sequelize');
const {
    isDotaLobbyReady,
    createDotaBot,
    invitePlayer,
    disconnectDotaBot,
    DotaBot,
} = require('./dotaBot');

const Op = Sequelize.Op;
const logger = require('./logger');
const shuffle = require('./util/shuffle');
const combinations = require('./util/combinations');
const CONSTANTS = require('./constants');
const {
    findOrCreateChannelInCategory,
    findOrCreateRole,
    addRoleToUser,
    resolveUser,
    getUserRoles,
    setChannelPrivate,
    setRolePermissions,
    setRoleMentionable,
} = require('./guild');
const {
    findLobbyByName,
    findLobbyById,
    findUserById,
    findOrCreateLobbyForGuild,
    findBot,
    updateLobbyName,
    updateLobby,
    updateBotStatusBySteamId,
    updateBotStatus, 
    findUnassignedBot,
    destroyChallengeBetweenUsers,
    destroyAllAcceptedChallengeForUser,
    updateQueuesForUser,
} = require('./db');
const {
    pipeP,
    mapPromise,
    tapP,
} = require('./util/fp');

const getLobby = async lobbyOrState => (lobbyOrState instanceof Sequelize.Model ? lobbyOrState : findLobbyById(lobbyOrState.id));

const getPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => lobby.getPlayers(options));

const getPlayerByUserId = lobbyOrState => async id => getPlayers({ where: { id } })(lobbyOrState).then(players => players[0]);

const getPlayerBySteamId = lobbyOrState => async steamid_64 => getPlayers({ where: { steamid_64 } })(lobbyOrState).then(players => players[0]);

const getPlayerByDiscordId = lobbyOrState => async discord_id => getPlayers({ where: { discord_id } })(lobbyOrState).then(players => players[0]);

const getNoTeamPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => lobby.getNoTeamPlayers(options));

const getNotReadyPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => lobby.getNotReadyPlayers(options));

const getReadyPlayers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => lobby.getReadyPlayers(options));

const mapPlayers = fn => async lobbyOrState => pipeP(getPlayers(), mapPromise(fn))(lobbyOrState);

const addPlayer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => lobby.addPlayer(user));

const removePlayer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => lobby.removePlayer(user));

const addPlayers = lobbyOrState => async users => mapPromise(addPlayer(lobbyOrState))(users);

const addRoleToPlayers = async lobbyState => mapPlayers(addRoleToUser(lobbyState.guild)(lobbyState.role))(lobbyState);

const updateLobbyPlayer = data => lobbyOrState => async (id) => getPlayerByUserId(lobbyOrState)(id).then(player => player.LobbyPlayer.update(data));

const updateLobbyPlayerBySteamId = data => lobbyOrState => async (steamid_64) => getPlayerBySteamId(lobbyOrState)(steamid_64).then(player => player.LobbyPlayer.update(data));

const setPlayerReady = ready => updateLobbyPlayer({ ready });

const setPlayerTeam = faction => updateLobbyPlayer({ faction });

const sortQueuersAsc = async queuers => Promise.resolve(queuers).then(q => q.sort((a, b) => a.LobbyQueuer.created_at - b.LobbyQueuer.created_at));

const getQueuers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => lobby.getQueuers(options));

const getActiveQueuers = options => async lobbyOrState => getLobby(lobbyOrState).then(lobby => lobby.getActiveQueuers(options)).then(sortQueuersAsc);

const getQueuerByUserId = lobbyOrState => async id => getQueuers({ where: { id } })(lobbyOrState).then(queuers => queuers[0]);

const getQueuerBySteamId = lobbyOrState => async steamid_64 => getQueuers({ where: { steamid_64 } })(lobbyOrState).then(queuers => queuers[0]);

const getQueuerByDiscordId = lobbyOrState => async discord_id => getQueuers({ where: { discord_id } })(lobbyOrState).then(queuers => queuers[0]);

const mapQueuers = fn => async lobbyOrState => pipeP(getQueuers(), mapPromise(fn))(lobbyOrState);

const mapActiveQueuers = fn => async lobbyOrState => pipeP(getActiveQueuers(), mapPromise(fn))(lobbyOrState);

const hasQueuer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => lobby.hasQueuer(user));

const addQueuer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => lobby.addQueuer(user));

const removeQueuer = lobbyOrState => async user => getLobby(lobbyOrState).then(lobby => lobby.removeQueuer(user));

const addQueuers = lobbyOrState => async users => mapPromise(addQueuer(lobbyOrState))(users);

const addRoleToQueuers = async lobbyState => mapQueuers(addRoleToUser(lobbyState.guild)(lobbyState.role))(lobbyState);

const updateLobbyQueuer = data => lobbyOrState => async (id) => getQueuerByUserId(lobbyOrState)(id).then(queuer => queuer.LobbyQueuer.update(data));

const updateLobbyQueuerBySteamId = data => lobbyOrState => async (steamid_64) => getQueuerBySteamId(lobbyOrState)(steamid_64).then(queuer => queuer.LobbyQueuer.update(data));

const setQueuerActive = active => updateLobbyQueuer({ active });

const removeUserFromQueues = async user => user.setQueues([]);

const removeQueuers = async lobbyOrState => getLobby(lobbyOrState).then(lobby => lobby.setQueuers([]));

const calcBalanceTeams = (players) => {
    logger.debug('calcBalanceTeams');
    const combs = combinations(players, 5);
    let best_weight_diff = 999999;
    let best_pairs = [];
    combs.forEach((comb) => {
        const team_1 = comb;
        const team_2 = players.filter(i => comb.indexOf(i) < 0);
        const weight_1 = team_1.reduce((total, player) => total + player.rank_tier, 0);
        const weight_2 = team_2.reduce((total, player) => total + player.rank_tier, 0);
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
    return best_pair;
};

const setTeams = lobbyOrState => async ([team_1, team_2]) => {
    const lobby = await getLobby(lobbyOrState);
    team_1.forEach(player => player.LobbyPlayer = { faction: 1 });
    team_2.forEach(player => player.LobbyPlayer = { faction: 2 });
    return lobby.setPlayers(team_1.concat(team_2), { through: { faction: 0 } });
};

const selectCaptainPairFromTiers = captain_rank_threshold => (tiers) => {
    const keys = Object.keys(tiers).sort();

    // loop through tiers. lower tier = higher priority
    for (const key of keys) {
        const tier = tiers[key];
        // only look at tiers with at least 2 players in them
        if (tier.length >= 2) {
            // get all possible pairs within the tier
            let combs = combinations(tier, 2);

            // filter out pairs that exceed skill difference threshold
            combs = combs.filter(([player_1, player_2]) => Math.abs(player_1.rank_tier - player_2.rank_tier) <= captain_rank_threshold);

            if (combs.length) {
                // select random pair
                shuffle(combs);

                return combs.pop();
            }
        }
    }
    return [];
};

const sortPlayersByCaptainPriority = (playersWithCaptainPriority) => {
    const tiers = {};
    for (const [player, captain_priority] of playersWithCaptainPriority) {
        if (captain_priority < Infinity) {
            tiers[captain_priority] = tiers[captain_priority] || [];
            tiers[captain_priority].push(player);
        }
    }
    return tiers;
};

const roleToCaptainPriority = regexp => role => {
    const match = role.name.match(regexp);
    if (match) {
        return parseInt(match[1]);
    }
}

const getCaptainPriorityFromRoles = (captain_role_regexp, roles) => {
    const regexp = new RegExp(captain_role_regexp);
    const priorities = roles.map(roleToCaptainPriority(regexp)).filter(Number.isFinite);
    return Math.min.apply(null, priorities);
};

const playerToCaptainPriority = getUserRoles => guild => captain_role_regexp => async player => [player, getCaptainPriorityFromRoles(captain_role_regexp, await getUserRoles(guild, player))];

const getPlayersWithCaptainPriority = getUserRoles => guild => captain_role_regexp => async lobbyOrState => mapPlayers(playerToCaptainPriority(getUserRoles)(guild)(captain_role_regexp))(lobbyOrState);

const getActiveQueuersWithCaptainPriority = getUserRoles => guild => captain_role_regexp => async lobbyOrState => mapActiveQueuers(playerToCaptainPriority(getUserRoles)(guild)(captain_role_regexp))(lobbyOrState);

const checkQueueForCaptains = getUserRoles => async lobbyOrState => pipeP(
    getActiveQueuersWithCaptainPriority(getUserRoles)(lobbyOrState.guild)(lobbyOrState.captain_role_regexp),
    sortPlayersByCaptainPriority,
    selectCaptainPairFromTiers(lobbyOrState.captain_rank_threshold),
)(lobbyOrState);

const assignCaptains = getUserRoles => async lobbyOrState => pipeP(
    getPlayersWithCaptainPriority(getUserRoles)(lobbyOrState.guild)(lobbyOrState.captain_role_regexp),
    sortPlayersByCaptainPriority,
    selectCaptainPairFromTiers(lobbyOrState.captain_rank_threshold),
)(lobbyOrState);

const calcDefaultGameMode = default_game_mode => (game_mode_preferences) => {
    const game_mode_totals = game_mode_preferences.reduce((tally, game_mode_preference) => {
        tally[game_mode_preference] = (tally[game_mode_preference] || 0) + 1;
        return tally;
    }, {});

    let best_game_mode = default_game_mode;
    let best_count = game_mode_totals[default_game_mode] || 0;
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
    getPlayers(),
    calcBalanceTeams,
    setTeams(lobbyOrState),
)(lobbyOrState);

const getDefaultGameMode = async lobbyOrState => pipeP(
    mapPlayers(player => player.game_mode_preference),
    calcDefaultGameMode(lobbyOrState.default_game_mode),
)(lobbyOrState);

const assignGameMode = async lobbyOrState => ({ ...lobbyOrState, game_mode: await getDefaultGameMode(lobbyOrState) });

const getDraftingFaction = draftOrder => async (lobbyOrState) => {
    const playersNoTeam = await getNoTeamPlayers()(lobbyOrState);
    const unassignedCount = playersNoTeam.length;
    if (unassignedCount === 0) {
        return 0;
    }
    return draftOrder[draftOrder.length - unassignedCount];
};

const getFactionCaptain = lobbyOrState => async faction => (faction > 0 && faction <= 2 ? getPlayerByUserId(lobbyOrState)([lobbyOrState.captain_1_user_id, lobbyOrState.captain_2_user_id][faction - 1]) : null);

const isPlayerDraftable = lobbyOrState => async (player) => {
    if (player.id === lobbyOrState.captain_1_user_id || player.id === lobbyOrState.captain_2_user_id) {
        return CONSTANTS.INVALID_DRAFT_CAPTAIN;
    }
    if (player.LobbyPlayer.faction !== 0) {
        return CONSTANTS.INVALID_DRAFT_PLAYER;
    }
    return CONSTANTS.PLAYER_DRAFTED;
};

const isCaptain = lobbyOrState => user => user.id === lobbyOrState.captain_1_user_id || user.id === lobbyOrState.captain_2_user_id;

const formatNameForLobby = input => input.replace(/[^0-9a-z]/gi, '').substring(0,15);

const getLobbyNameFromCaptains = async (captain_name_1, captain_name_2, counter) => {
    const name1 = formatNameForLobby(captain_name_1);
    const name2 = formatNameForLobby(captain_name_2);
    const lobby_name = `${name1}-${name2}-${counter}`;
    const lobby = await findLobbyByName(lobby_name);
    if (!lobby) {
        return lobby_name;
    }
    else {
        return getLobbyNameFromCaptains(captain_name_1, captain_name_2, counter + 1);
    }
}

const resetLobbyState = async (_lobbyState) => {
    const lobbyState = { ..._lobbyState };
    switch (lobbyState.state) {
    case CONSTANTS.STATE_CHECKING_READY:
        lobbyState.state = CONSTANTS.STATE_BEGIN_READY;
    break;
    case CONSTANTS.STATE_BOT_STARTED:
    case CONSTANTS.STATE_WAITING_FOR_PLAYERS:
        lobbyState.state = CONSTANTS.STATE_WAITING_FOR_BOT;
    break;
    default:
        lobbyState.state = lobbyState.state || CONSTANTS.STATE_NEW;
    break;
    }
    await updateLobby(lobbyState);
    return lobbyState;
};

const connectDotaBot = async (dotaBot) => {
    logger.debug(`connectDotaBot ${dotaBot.steamid_64}`);
    await dotaBot.connect();
    await updateBotStatusBySteamId(CONSTANTS.BOT_ONLINE)(dotaBot.steamid_64);
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
        dotaBot = await pipeP(
            findBot,
            createDotaBot,
            connectDotaBot,
        )(lobbyState.bot_id);
        logger.debug(`setupLobbyBot bot connected lobby_id:${lobbyState.lobby_id}`);
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
    catch (e) {
        logger.log({level: 'error', message: e});
        if (dotaBot) {
            await disconnectDotaBot(dotaBot);
        }
        return null;
    }
};

const setLobbyStateKilled = async (lobbyState) => ({
    ...lobbyState,
    state: CONSTANTS.STATE_KILLED,
    channel: null,
    channel_id: null,
    role: null,
    role_id: null,
    bot_id: null,
});

const isReadyCheckTimedOut = ({ ready_check_timeout, ready_check_time }) => ready_check_time + ready_check_timeout < Date.now();

const createLobbyState = ({
    guild,
    category,
    ready_check_timeout,
    captain_rank_threshold,
    captain_role_regexp,
}) => (channel, role) => (lobby) => ({
    guild,
    category,
    channel,
    role,
    ready_check_timeout,
    captain_rank_threshold,
    captain_role_regexp,
    ...(lobby instanceof Sequelize.Model ? lobby.get({ plain: true }) : lobby)
});

const lobbyToLobbyState = ({ findOrCreateChannelInCategory, makeRole }) => ({
    guild,
    category,
    ready_check_timeout,
    captain_rank_threshold,
    captain_role_regexp,
}) => async (lobby) => {
    let channel;
    try {
        channel = await findOrCreateChannelInCategory(guild, category, lobby.lobby_name);
        const role = await makeRole(guild)([])(true)(lobby.lobby_name);
        const inhouseState = { guild, category, ready_check_timeout, captain_rank_threshold, captain_role_regexp };
        const lobbyState = await pipeP(
            createLobbyState(inhouseState)(channel, role),
            resetLobbyState,
            tapP(addRoleToPlayers),
        )(lobby);
        return lobbyState;
    }
    catch (e) {
        logger.log({level: 'error', message: e});
        lobby.update({ state: CONSTANTS.STATE_FAILED });
        if (channel) {
            await channel.send('Lobby failed to load.');
            const everyoneRole = guild.roles.get(guild.id);
            await setChannelPrivate(guild)(channel);
        }
        throw e;
    }
};

const forceLobbyDraft = async (_lobbyState, captain_1, captain_2) => {
    const lobbyState = { ..._lobbyState };
    const states = [
        CONSTANTS.STATE_ASSIGNING_CAPTAINS,
        CONSTANTS.STATE_CHOOSING_SIDE,
        CONSTANTS.STATE_DRAFTING_PLAYERS,
        CONSTANTS.STATE_AUTOBALANCING,
        CONSTANTS.STATE_TEAMS_SELECTED,
        CONSTANTS.STATE_WAITING_FOR_BOT,
        CONSTANTS.STATE_BOT_ASSIGNED,
        CONSTANTS.STATE_BOT_STARTED,
        CONSTANTS.STATE_BOT_FAILED,
        CONSTANTS.STATE_WAITING_FOR_PLAYERS,
    ];
    if (states.indexOf(lobbyState.state) != -1) {
        lobbyState.state = CONSTANTS.STATE_CHOOSING_SIDE;
        lobbyState.captain_1_user_id = captain_1.id;
        lobbyState.captain_2_user_id = captain_2.id;
        lobbyState.bot_id = null;
        if (lobbyState.dotaBot) {
            await disconnectDotaBot(lobbyState.dotaBot);
        }
    }
    return lobbyState;
}

const createChallengeLobby = async ({ inhouseState, captain_1, captain_2 }) => {        
    const captain_member_1 = await resolveUser(inhouseState.guild, captain_1.discord_id);
    const captain_member_2 = await resolveUser(inhouseState.guild, captain_2.discord_id);
    const lobby_name = await getLobbyNameFromCaptains(captain_member_1.displayName, captain_member_2.displayName, 1);
    const lobby = await findOrCreateLobbyForGuild(guild.id, CONSTANTS.QUEUE_TYPE_CHALLENGE, queue_name);
    lobby.captain_1_user_id = captain_1.id;
    lobby.captain_2_user_id = captain_2.id;
    await addQueuers(lobby)([captain_1, captain_2]);
    await updateLobby(lobby);
    const lobbyState = await lobbyToLobbyState({ findOrCreateChannelInCategory, makeRole })(inhouseState)(lobby);
}

const lobbyQueuerToPlayer = lobbyOrState => async user => pipeP(updateQueuesForUser(false), addPlayer(lobbyOrState))(user);

const returnPlayerToQueue = lobbyOrState => async user => pipeP(updateQueuesForUser(true), removePlayer(lobbyOrState))(user);

const returnPlayersToQueue = async lobbyOrState => mapPlayers(returnPlayerToQueue(lobbyOrState))(lobbyOrState);

const LobbyQueueHandlers = {
    [CONSTANTS.QUEUE_TYPE_DRAFT]: checkQueueForCaptains => async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        let queuers = await getActiveQueuers()(lobbyState);
        if (queuers.length >= 10) {
            // find a suitable captain pair
            const [captain_1, captain_2] = await checkQueueForCaptains(getUserRoles)(lobbyState);
            //logger.debug(`LobbyQueueHandlers checkQueueForCaptains captain_1 ${util.inspect(captain_1)} captain_2 ${util.inspect(captain_2)}`);
            if (captain_1 && captain_2) {
                lobbyState.captain_1_user_id = captain_1.id;
                lobbyState.captain_2_user_id = captain_2.id;
                lobbyState.state = CONSTANTS.STATE_BEGIN_READY;
                
                // update captain queue activity and add as player
                await lobbyQueuerToPlayer(lobbyState)(captain_1);
                await lobbyQueuerToPlayer(lobbyState)(captain_2);

                // update top 8 queue activity and add as player, excluding captains
                queuers = queuers.filter(queuer => queuer.id !== captain_1.id && queuer.id !== captain_2.id).slice(0, 8);
                await mapPromise(lobbyQueuerToPlayer(lobbyState))(queuers);
            }
        }
        return { lobbyState, events };
    },
    [CONSTANTS.QUEUE_TYPE_AUTO]: () => async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        const queuers = await getActiveQueuers()(lobbyState);
        if (queuers.length >= 10) {
            lobbyState.state = CONSTANTS.STATE_BEGIN_READY;

            // update top 10 queue activity and add as player
            await mapPromise(lobbyQueuerToPlayer(lobbyState))(queuers.slice(0, 10));
        }
        return { lobbyState, events };
    },
    [CONSTANTS.QUEUE_TYPE_CHALLENGE]: () => async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        let [captain_1, captain_2] = await mapPromise(getQueuerByUserId(lobbyState))([lobbyState.captain_1_user_id, lobbyState.captain_2_user_id]);
        // if either captain has left queue, kill the lobby and the queue
        if (!captain_1 || !captain_2) {
            lobbyState.state = CONSTANTS.STATE_PENDING_KILL;
            await removeQueuers(lobbyState);
            captain_1 = captain_1 || await findUserById(lobbyState.captain_1_user_id);
            captain_2 = captain_2 || await findUserById(lobbyState.captain_2_user_id);
            await destroyChallengeBetweenUsers(captain_1)(captain_2);
            await destroyChallengeBetweenUsers(captain_2)(captain_1);
        }
        else {
            let queuers = await getActiveQueuers()(lobbyState);
            // check if captains are active in queue
            if (queuers.length >= 10 && queuers.find(queuer => queuer.id === captain_1.id) && queuers.find(queuer => queuer.id === captain_2.id)) {
                lobbyState.state = CONSTANTS.STATE_BEGIN_READY;
                
                // update captain queue activity and add as player
                await lobbyQueuerToPlayer(lobbyState)(captain_1);
                await lobbyQueuerToPlayer(lobbyState)(captain_2);
                
                // update top 8 queue activity and add as player, excluding captains
                queuers = queuers.filter(queuer => queuer.id !== captain_1.id && queuer.id !== captain_2.id).slice(0, 8);
                await mapPromise(lobbyQueuerToPlayer(lobbyState))(queuers);
            }
        }
        return { lobbyState, events };
    }
}

const removeLobbyPlayersFromQueues = async (lobbyOrState) => mapPlayers(removeUserFromQueues)(lobbyOrState);

const LobbyStateTransitions = {
    [CONSTANTS.STATE_CHECKING_READY]: {
        [CONSTANTS.QUEUE_TYPE_DRAFT]: CONSTANTS.STATE_CHOOSING_SIDE,
        [CONSTANTS.QUEUE_TYPE_CHALLENGE]: CONSTANTS.STATE_CHOOSING_SIDE,
        [CONSTANTS.QUEUE_TYPE_AUTO]: CONSTANTS.STATE_AUTOBALANCING,
    }
}

const transitionLobbyState = lobbyOrState => ({ ...lobbyOrState, state: LobbyStateTransitions[lobbyOrState.state][lobbyOrState.queue_type] });

const assignLobbyName = async (lobbyOrState) => {
    if (lobbyOrState.queue_type === CONSTANTS.QUEUE_TYPE_CHALLENGE) {
        return { ...lobbyOrState };
    }
    const lobby_name = hri.random();
    const lobby = await findLobbyByName(lobby_name);
    if (!lobby) {
        await updateLobbyName(lobbyOrState)(lobby_name);
        return { ...lobbyOrState, lobby_name };
    }
    return assignLobbyName(lobbyOrState);
}

const LobbyStateHandlers = {
    [CONSTANTS.STATE_NEW]: async (_lobbyState) => ({ lobbyState: {..._lobbyState, state: CONSTANTS.STATE_WAITING_FOR_QUEUE }, events: [] }),
    [CONSTANTS.STATE_WAITING_FOR_QUEUE]: async (_lobbyState) => LobbyQueueHandlers[_lobbyState.queue_type](checkQueueForCaptains)(_lobbyState),
    [CONSTANTS.STATE_BEGIN_READY]: async (_lobbyState) => {
        let lobbyState = { ..._lobbyState };
        const events = [];
        lobbyState = await pipeP(
            assignLobbyName,
            assignGameMode,
        )(lobbyState);

        // destroy any accepted challenges for players
        await mapPlayers(destroyAllAcceptedChallengeForUser)(lobbyState);

        if (!lobbyState.ready_check_time) {
            lobbyState.ready_check_time = Date.now();
            events.push(CONSTANTS.EVENT_READY_CHECK_START);
            events.push(CONSTANTS.MSG_READY_CHECK_START);
        }
        lobbyState.state = CONSTANTS.STATE_CHECKING_READY;
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_CHECKING_READY]: async (_lobbyState) => {
        let lobbyState = { ..._lobbyState };
        const events = [];
        const playersReady = await getReadyPlayers()(lobbyState);
        logger.debug(`lobby run playersReady ${playersReady.length}`);
        if (playersReady.length === 10) {
            await removeLobbyPlayersFromQueues(lobbyState);
            lobbyState = transitionLobbyState(lobbyState);
            events.push(CONSTANTS.EVENT_PLAYERS_READY);
            events.push(CONSTANTS.MSG_PLAYERS_READY);
        }
        else if (isReadyCheckTimedOut(lobbyState)) {
            events.push(CONSTANTS.MSG_READY_CHECK_FAILED);
            lobbyState.state = CONSTANTS.STATE_PENDING_KILL;
        }
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_ASSIGNING_CAPTAINS]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        if (!lobbyState.captain_1_user_id || !lobbyState.captain_2_user_id) {
            const [captain_1, captain_2] = await assignCaptains(getUserRoles)(lobbyState);
            logger.debug(`lobby run assignCaptains captain_1 ${!!captain_1} captain_2 ${!!captain_2}`);
            lobbyState.state = (captain_1 && captain_2) ? CONSTANTS.STATE_CHOOSING_SIDE : CONSTANTS.STATE_AUTOBALANCING;
            lobbyState.captain_1_user_id = captain_1 ? captain_1.id : null;
            lobbyState.captain_2_user_id = captain_2 ? captain_2.id : null;
            events.push(CONSTANTS.MSG_ASSIGNED_CAPTAINS);
        }
        else {
            logger.debug(`lobby run assignCaptains captains exist ${lobbyState.captain_1_user_id}, ${lobbyState.captain_2_user_id}`);
            events.push(CONSTANTS.MSG_ASSIGNED_CAPTAINS);
            lobbyState.state = CONSTANTS.STATE_CHOOSING_SIDE;
        }
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_CHOOSING_SIDE]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        await setPlayerTeam(1)(lobbyState)(lobbyState.captain_1_user_id);
        await setPlayerTeam(2)(lobbyState)(lobbyState.captain_2_user_id);
        lobbyState.state = CONSTANTS.STATE_DRAFTING_PLAYERS;
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_DRAFTING_PLAYERS]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        lobbyState.faction = await getDraftingFaction([1,2,2,1,2,1,1,2])(lobbyState);
        const lobbyPlayer = await getFactionCaptain(lobbyState)(lobbyState.faction);
        logger.debug(`lobby run playerDraft faction ${lobbyState.faction}`);
        if (lobbyPlayer) {
            logger.debug(`lobby run lobbyPlayer ${lobbyPlayer.id}`);
            lobbyState.currentPick = lobbyPlayer.LobbyPlayer.faction;
            events.push(CONSTANTS.MSG_DRAFT_TURN);
        }
        else {
            lobbyState.state = CONSTANTS.STATE_TEAMS_SELECTED;
        }
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_AUTOBALANCING]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        events.push(CONSTANTS.MSG_AUTOBALANCING);
        const playersNoTeam = await getNoTeamPlayers()(lobbyState);
        const unassignedCount = playersNoTeam.length;
        logger.debug(`Autobalancing unassigned count ${unassignedCount}`);
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
        events.push(CONSTANTS.MSG_TEAMS_SELECTED);
        return { lobbyState, events };
    },
    [CONSTANTS.STATE_WAITING_FOR_BOT]: async (_lobbyState) => {
        const lobbyState = { ..._lobbyState };
        const events = [];
        if (!lobbyState.bot_id) {
            const bot = await findUnassignedBot();
            if (bot) {
                logger.debug(`lobby run findUnassignedBot ${bot.steamid_64}`);
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
    [CONSTANTS.STATE_BOT_ASSIGNED]: async (_lobbyState) => ({ lobbyState: { ..._lobbyState }, events: [] }),
    [CONSTANTS.STATE_BOT_STARTED]: async (_lobbyState) => ({ lobbyState: { ..._lobbyState }, events: [] }),
    [CONSTANTS.STATE_BOT_FAILED]: async (_lobbyState) => ({ lobbyState: { ..._lobbyState }, events: [] }),
    [CONSTANTS.STATE_WAITING_FOR_PLAYERS]: async (_lobbyState) => ({ lobbyState: { ..._lobbyState }, events: [] }),
    [CONSTANTS.STATE_MATCH_IN_PROGRESS]: async (_lobbyState) => ({ lobbyState: { ..._lobbyState }, events: [] }),
    [CONSTANTS.STATE_MATCH_ENDED]: async (_lobbyState) => ({ lobbyState: { ..._lobbyState }, events: [] }),
    [CONSTANTS.STATE_PENDING_KILL]: async (_lobbyState) => ({ lobbyState: { ..._lobbyState }, events: [] }),
    [CONSTANTS.STATE_KILLED]: async (_lobbyState) => ({ lobbyState: { ..._lobbyState }, events: [] }),
};

const runLobby = async lobbyState => LobbyStateHandlers[lobbyState.state](_lobbyState);

module.exports = {
    getLobby,
    getPlayers,
    getPlayerByUserId,
    getPlayerBySteamId,
    getPlayerByDiscordId,
    getNoTeamPlayers,
    getNotReadyPlayers,
    getReadyPlayers,
    mapPlayers,
    addPlayer,
    removePlayer,
    addPlayers,
    addRoleToPlayers,
    updateLobbyPlayer,
    updateLobbyPlayerBySteamId,
    setPlayerReady,
    setPlayerTeam,
    sortQueuersAsc,
    getQueuers,
    getActiveQueuers,
    getQueuerByUserId,
    getQueuerBySteamId,
    getQueuerByDiscordId,
    mapQueuers,
    mapActiveQueuers,
    hasQueuer,
    addQueuer,
    removeQueuer,
    addQueuers,
    addRoleToQueuers,
    updateLobbyQueuer,
    updateLobbyQueuerBySteamId,
    setQueuerActive,
    removeUserFromQueues,
    removeQueuers,
    calcBalanceTeams,
    setTeams,
    selectCaptainPairFromTiers,
    sortPlayersByCaptainPriority,
    roleToCaptainPriority,
    getCaptainPriorityFromRoles,
    playerToCaptainPriority,
    getPlayersWithCaptainPriority,
    getActiveQueuersWithCaptainPriority,
    checkQueueForCaptains,
    assignCaptains,
    calcDefaultGameMode,
    autoBalanceTeams,
    getDefaultGameMode,
    assignGameMode,
    getDraftingFaction,
    getFactionCaptain,
    isPlayerDraftable,
    isCaptain,
    formatNameForLobby,
    getLobbyNameFromCaptains,
    resetLobbyState,
    connectDotaBot,
    createDotaBotLobby,
    setupLobbyBot,
    setLobbyStateKilled,
    isReadyCheckTimedOut,
    createLobbyState,
    lobbyToLobbyState,
    createChallengeLobby,
    forceLobbyDraft,
    lobbyQueuerToPlayer,
    returnPlayerToQueue,
    returnPlayersToQueue,
    LobbyQueueHandlers,
    removeLobbyPlayersFromQueues,
    LobbyStateTransitions,
    transitionLobbyState,
    assignLobbyName,
    LobbyStateHandlers,
    runLobby,
};
