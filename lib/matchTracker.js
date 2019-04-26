/**
 * @module matchTracker
 */

const { EventEmitter } = require('events');
const got = require('got');
const convertor = require('steam-id-convertor');
const heroes = require('dotaconstants/build/heroes.json');
const logger = require('./logger');
const CONSTANTS = require('./constants');
const Lobby = require('./lobby');
const Db = require('./db');
const Fp = require('./util/fp');
const { cache } = require('./cache');

const calcEloChange = (r1, r2, K, S) => {
    const E = 1 / (1 + (10 ** ((r2 - r1) / 400)));
    return K * (S - E);
};

const updatePlayerRatings = async (lobbyState) => {
    const lobby = await Lobby.getLobby(lobbyState);
    const league = await Db.findLeagueById(lobby.leagueId);
    const faction1 = await Lobby.getFaction1Players()(lobby);
    const faction2 = await Lobby.getFaction2Players()(lobby);
    const r1 = faction1.reduce((total, player) => total + player.rating, 0) / faction1.length;
    const r2 = faction2.reduce((total, player) => total + player.rating, 0) / faction2.length;
    const K = league.eloKFactor;
    const S1 = lobby.winner === 1 ? 1 : 0;
    const S2 = lobby.winner === 2 ? 1 : 0;
    const D1 = Math.round(calcEloChange(r1, r2, K, S1));
    const D2 = Math.round(calcEloChange(r2, r1, K, S2));
    logger.silly(`updatePlayerRatings ${lobby.winner}`);
    logger.silly(`updatePlayerRatings ${r1} ${S1} ${D1}`);
    logger.silly(`updatePlayerRatings ${r2} ${S2} ${D2}`);
    return Fp.allPromise([
        faction1.map(player => Fp.allPromise([
            Lobby.updateLobbyPlayer({ ratingDiff: D1 })(lobby)(player.id),
            Db.updateUserRating(player)(player.rating + D1),
            Db.findOrCreateLeaderboard(lobby)(player)(player.rating + D1)
                .then(leaderboard => Db.incrementLeaderboardRecord(S1)(S2)(leaderboard)),
        ])),
        faction2.map(player => Fp.allPromise([
            Lobby.updateLobbyPlayer({ ratingDiff: D2 })(lobby)(player.id),
            Db.updateUserRating(player)(player.rating + D2),
            Db.findOrCreateLeaderboard(lobby)(player)(player.rating + D1)
                .then(leaderboard => Db.incrementLeaderboardRecord(S2)(S1)(leaderboard)),
        ])),
    ]);
};

const getHeroNameFromId = id => (heroes[id] ? heroes[id].localized_name : 'Unknown');

const createMatchPlayerDetails = data => `**${data.personaname}**
*${getHeroNameFromId(data.hero_id)}* (${data.level})
KDA: ${data.kills}/${data.deaths}/${data.assists}
CS: ${data.last_hits}/${data.denies}
Gold: ${data.total_gold} (${data.gold_per_min}/min)`;

const getOpenDotaMatchDetails = async (matchId) => {
    logger.silly(`matchTracker getOpenDotaMatchDetails ${matchId}`);
    try {
        const response = await got(`https://api.opendota.com/api/matches/${matchId}`, { json: true });
        return response.body && !response.body.error ? response.body : null;
    }
    catch (e) {
        logger.error(e);
        return null;
    }
};

const getValveMatchDetails = async (matchId) => {
    logger.silly(`matchTracker getValveMatchDetails ${matchId}`);
    try {
        const response = await got(`http://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/v1/?key=${process.env.STEAM_API_KEY}&match_id=${matchId}`, { json: true });
        return response.body && response.body.result && !response.body.result.error ? response.body : null;
    }
    catch (e) {
        logger.error(e);
        return null;
    }
};

const setMatchDetails = async (lobbyOrState) => {
    logger.silly(`matchTracker setMatchDetails matchId ${lobbyOrState.matchId}`);
    let lobby = await Lobby.getLobby(lobbyOrState);
    logger.silly(`matchTracker setMatchDetails lobby.id ${lobby.id} ${lobby.matchId}`);
    if (!lobby.odotaData) {
        const odotaData = await getOpenDotaMatchDetails(lobby.matchId);
        if (odotaData) {
            await Db.updateLobby({
                odotaData,
                finishedAt: odotaData.start_time + odotaData.duration * 1000,
                id: lobby.id,
            });
        }
    }
    lobby = await lobby.reload();
    cache.Lobby.set(lobby.id, lobby);
    return lobby;
};

const setMatchPlayerDetails = async (_lobby) => {
    const lobby = await Lobby.getLobby(_lobby);
    const players = await Lobby.getPlayers()(lobby);
    let winner = 0;
    const tasks = [];
    for (const playerData of lobby.odotaData.players) {
        if (playerData.account_id) {
            const steamId64 = convertor.to64(playerData.account_id);
            const player = players.find(p => p.steamId64 === steamId64);
            if (player) {
                const data = {
                    win: playerData.win,
                    lose: playerData.lose,
                    heroId: playerData.hero_id,
                    kills: playerData.kills,
                    deaths: playerData.deaths,
                    assists: playerData.assists,
                    gpm: playerData.gold_per_min,
                    xpm: playerData.xp_per_min,
                };
                if (player.id === lobby.captain1UserId) {
                    if (playerData.win === 1) {
                        winner = 1;
                    }
                }
                else if (player.id === lobby.captain2UserId) {
                    if (playerData.win === 1) {
                        winner = 2;
                    }
                }
                tasks.push(Lobby.updateLobbyPlayerBySteamId(data)(_lobby)(steamId64));
            }
        }
    }
    await Fp.allPromise(tasks);
    await Db.updateLobbyWinner(lobby)(winner);
};

const createMatchEndMessageEmbed = async (matchId) => {
    const lobby = await Db.findLobbyByMatchId(matchId);
    const { odotaData } = lobby;

    const players = await Lobby.getPlayers()({ id: lobby.id });
    const captain1 = players.find(player => player.id === lobby.captain1UserId);
    const captain2 = players.find(player => player.id === lobby.captain2UserId);
    const captain1Data = odotaData.players.find(player => player.account_id.toString() === convertor.to32(captain1.steamId64));
    const captain2Data = odotaData.players.find(player => player.account_id.toString() === convertor.to32(captain2.steamId64));
    const radiantCaptainPlayer = captain1Data.isRadiant ? captain1Data : captain2Data;
    const direCaptainPlayer = captain1Data.isRadiant ? captain2Data : captain1Data;
    logger.silly(`createMatchEndMessageEmbed radiantName ${radiantCaptainPlayer.personaname}`);
    logger.silly(`createMatchEndMessageEmbed direName ${direCaptainPlayer.personaname}`);
    const radiantName = radiantCaptainPlayer.personaname;
    const direName = direCaptainPlayer.personaname;

    const radiantDetails = odotaData.players.filter(player => player.isRadiant).map(createMatchPlayerDetails).join('\t\n\n');
    const direDetails = odotaData.players.filter(player => !player.isRadiant).map(createMatchPlayerDetails).join('\t\n\n');

    const title = `${radiantName} vs ${direName}`;

    const winner = odotaData.radiant_win ? radiantName : direName;

    const goldLead = odotaData.radiant_gold_adv[odotaData.radiant_gold_adv.length - 1];
    const goldLeadTeam = goldLead > 0 ? 'Radiant' : 'Dire';

    const xpLead = odotaData.radiant_xp_adv[odotaData.radiant_xp_adv.length - 1];
    const xpLeadTeam = xpLead > 0 ? 'Radiant' : 'Dire';

    const durationHours = Math.floor(odotaData.duration / 3600);
    const durationMinutes = Math.floor((odotaData.duration % 3600) / 60);
    const durationSeconds = odotaData.duration % 3600 % 60;

    const duration = `${durationHours > 0 ? `${durationHours.toString()}:` : ''}${`${durationMinutes.toString().padStart(2, '0')}:`}${durationSeconds.toString().padStart(2, '0')}`;

    const description = `**${winner}** Victory!
Match ID: ${matchId} [DB](https://www.dotabuff.com/matches/${matchId})/[OD](https://www.opendota.com/matches/${matchId})/[SZ](https://stratz.com/en-us/match/${matchId})`;

    const matchDetails = `**Duration:** ${duration}
**Score:** ${odotaData.radiant_score} - ${odotaData.dire_score}
**Gold:** +${Math.abs(goldLead)} ${goldLeadTeam}
**Exp:** +${Math.abs(xpLead)} ${xpLeadTeam}
`;
    return {
        embed: {
            color: 3447003,
            title,
            description,
            fields: [
                {
                    name: 'Match Details',
                    value: matchDetails,
                },
                {
                    name: radiantName,
                    value: radiantDetails,
                    inline: true,
                },
                {
                    name: direName,
                    value: direDetails,
                    inline: true,
                },
            ],
        },
    };
};

/**
 * Match tracker checks opendota and valve match apis to see if a match has finished
 * and saves the match data to the database. */
class MatchTracker extends EventEmitter {
    /**
     * Creates an inhouse league match tracker.
     */
    constructor(interval) {
        super();
        this.interval = interval;
        this.enabled = true;
        this.blocking = false;
        this.lobbies = [];
        this.runTimer = null;
    }

    async loadLobbies() {
        let lobbies = await Db.findAllInProgressLobbies();
        this.lobbies.push(...lobbies.map(lobby => ({
            lobby,
            lastCheck: null,
        })));
        lobbies = await Db.findAllMatchEndedLobbies();
        this.lobbies.push(...lobbies.map(lobby => ({
            lobby,
            lastCheck: null,
        })));
    }

    addLobby(lobby) {
        this.lobbies.push({
            lobby,
            lastCheck: null,
        });
    }

    /**
     * Event for returning stats from a lobby.
     *
     * @event module:ihlManager~EVENT_MATCH_STATS
     * @param {module:db.Lobby} lobby - The lobby with stats.
     */

    /**
     * The match polling loop
     * @async
     * @fires module:ihlManager~EVENT_MATCH_STATS
     */
    async run() {
        logger.silly(`matchTracker run ${this.blocking}`);
        if (this.blocking) return;
        if (this.enabled && this.lobbies.length) {
            this.blocking = true;
            const data = this.lobbies.shift();
            if (!data.lastCheck || data.lastCheck < Date.now() - this.interval) {
                data.lastCheck = Date.now();
                const lobby = await setMatchDetails(data.lobby);
                if (lobby.odotaData) {
                    await setMatchPlayerDetails(lobby);
                    this.emit(CONSTANTS.EVENT_MATCH_STATS, lobby);
                }
                else if (lobby.state === CONSTANTS.STATE_MATCH_IN_PROGRESS
                         || lobby.state === CONSTANTS.STATE_MATCH_ENDED) {
                    logger.silly(`matchTracker no data, queueing ${lobby.id}`);
                    const maxCheckTime = new Date();
                    maxCheckTime.setHours(maxCheckTime.getHours() - 4);
                    if (lobby.startedAt < maxCheckTime) {
                        this.lobbies.push(data);
                    }
                    else {
                        this.emit(CONSTANTS.EVENT_MATCH_NO_STATS, lobby);
                    }
                }

                if (this.lobbies.length) {
                    logger.silly('matchTracker looping');
                    this.runTimer = setTimeout(() => this.run(), 1000);
                }
            }
            else {
                data.lastCheck = Date.now();
                this.lobbies.push(data);
            }
            this.blocking = false;
        }
    }

    /**
     * Enables the match polling loop
     * @async
     */
    enable() {
        logger.silly('matchTracker start');
        this.enabled = true;
    }

    /**
     * Disables the match polling loop
     * @async
     */
    disable() {
        this.enabled = false;
        clearTimeout(this.runTimer);
    }
}

module.exports = {
    calcEloChange,
    updatePlayerRatings,
    getOpenDotaMatchDetails,
    getValveMatchDetails,
    setMatchDetails,
    setMatchPlayerDetails,
    createMatchEndMessageEmbed,
    MatchTracker,
};
