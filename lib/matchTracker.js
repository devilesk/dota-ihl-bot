/**
 * @module matchTracker
 */
 
 const EventEmitter = require('events').EventEmitter;
const Promise = require('bluebird');
const rp = require('request-promise');
const convertor = require('steam-id-convertor');
const util = require('util');
// const convertor = require('steam-id-convertor');
const heroes = require('dotaconstants/build/heroes.json');
const logger = require('./logger');
const CONSTANTS = require('./constants');
const dotenv = require('dotenv').config();
const {
    findAllInProgressLobbies,
    findLobbyByMatchId,
} = require('./db');
const {
    getPlayers,
    getLobby,
    updateLobbyPlayerBySteamId,
} = require('./lobby');

const getHeroNameFromId = id => (heroes[id] ? heroes[id].localized_name : 'Unknown');

const createMatchPlayerDetails = data => `**${data.personaname}**
*${getHeroNameFromId(data.hero_id)}* (${data.level})
KDA: ${data.kills}/${data.deaths}/${data.assists}
CS: ${data.last_hits}/${data.denies}
Gold: ${data.total_gold} (${data.gold_per_min}/min)`;

const getOpenDotaMatchDetails = async match_id => {
    logger.debug(`matchTracker getOpenDotaMatchDetails ${match_id}`);
    const options = {
        uri: `https://api.opendota.com/api/matches/${match_id}`,
        json: true,
    };
    const data = await rp(options);
    return data && !data.error ? data : null;
};

const getValveMatchDetails = async match_id => {
    logger.debug(`matchTracker getValveMatchDetails ${match_id}`);
    const options = {
        uri: `http://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/v1/?key=${process.env.STEAM_API_KEY}&match_id=${match_id}`,
        json: true,
    };
    const data = await rp(options);
    return data && data.result && !data.result.error ? data : null;
};

const setMatchDetails = async lobbyOrState => {
    logger.debug(`matchTracker setMatchDetails match_id ${lobbyOrState.match_id}`);
    const lobby = await getLobby(lobbyOrState);
    logger.debug(`matchTracker setMatchDetails lobby.id ${lobby.id}`);
    const data = {};
    if (!lobby.odata_data) {
        data.odota_data = await getOpenDotaMatchDetails(lobby.match_id);
    }
    if (!lobby.valve_data) {
        data.valve_data = await getValveMatchDetails(lobby.match_id);
    }
    if (data.odota_data || data.valve_data) {
        await lobby.update(data);
    }
    logger.debug(`matchTracker setMatchDetails ${util.inspect(lobby)}`);
    return lobby;
};

const setMatchPlayerDetails = async _lobby => {
    const lobby = await getLobby(_lobby);
    const odota_data = lobby.odota_data;
    for (let player_data of lobby.odota_data.players) {
        const steamid_64 = convertor.to64(player_data.account_id);
        const data = {
            hero_id: player_data.hero_id,
            kills: player_data.kills,
            deaths: player_data.deaths,
            assists: player_data.assists,
            gpm: player_data.gold_per_min,
            xpm: player_data.xp_per_min,
        }
        await updateLobbyPlayerBySteamId(data)(_lobby)(steamid_64);
    }
}

const createMatchEndMessageEmbed = async match_id => {
    const lobby = await findLobbyByMatchId(match_id);
    const valve_data = lobby.valve_data.result;
    const odota_data = lobby.odota_data;

    const players = await getPlayers()({ id: lobby.id });
    const radiant_captain_player = players.find(player => player.id === lobby.captain_1_user_id);
    const dire_captain_player = players.find(player => player.id === lobby.captain_2_user_id);

    // const radiant_drafter_steamid_64 = convertor.to64(valve_data.radiant_captain);
    // const radiant_drafter_player = players.find(player => player.steamid_64 === radiant_drafter_steamid_64);

    // const dire_drafter_steamid_64 = convertor.to64(valve_data.dire_captain);
    // const dire_drafter_player = players.find(player => player.steamid_64 === dire_drafter_steamid_64);
    logger.debug(`createMatchEndMessageEmbed radiant_name ${valve_data.radiant_name}`);
    logger.debug(`createMatchEndMessageEmbed dire_name ${valve_data.dire_name}`);
    const radiant_name = valve_data.radiant_name || radiant_captain_player.nickname;
    const dire_name = valve_data.dire_name || dire_captain_player.nickname;

    const radiant_details = odota_data.players.filter(player => player.isRadiant).map(player => createMatchPlayerDetails(player)).join('\t\n\n');
    const dire_details = odota_data.players.filter(player => !player.isRadiant).map(player => createMatchPlayerDetails(player)).join('\t\n\n');

    const title = `${radiant_name} vs ${dire_name}`;

    const winner = valve_data.radiant_win ? radiant_name : dire_name;

    const gold_lead = odota_data.radiant_gold_adv[odota_data.radiant_gold_adv.length - 1];
    const gold_lead_team = gold_lead > 0 ? 'Radiant' : 'Dire';

    const xp_lead = odota_data.radiant_xp_adv[odota_data.radiant_xp_adv.length - 1];
    const xp_lead_team = xp_lead > 0 ? 'Radiant' : 'Dire';

    const duration_hours = Math.floor(odota_data.duration / 3600);
    const duration_minutes = Math.floor((odota_data.duration % 3600) / 60);
    const duration_seconds = odota_data.duration % 3600 % 60;

    const duration = `${duration_hours > 0 ? `${duration_hours.toString()}:` : ''}${`${duration_minutes.toString().padStart(2, '0')}:`}${duration_seconds.toString().padStart(2, '0')}`;

    const description = `**${winner}** Victory!
Match ID: ${match_id} [DB](https://www.dotabuff.com/matches/${match_id})/[OD](https://www.opendota.com/matches/${match_id})`;

    const match_details = `**Duration:** ${duration}
**Score:** ${valve_data.radiant_score} - ${valve_data.dire_score}
**Gold:** +${Math.abs(gold_lead)} ${gold_lead_team}
**Exp:** +${Math.abs(xp_lead)} ${xp_lead_team}
`;
    return {
        embed: {
            color: 3447003,
            title,
            description,
            fields: [
                {
                    name: 'Match Details',
                    value: match_details,
                },
                {
                    name: radiant_name,
                    value: radiant_details,
                    inline: true,
                },
                {
                    name: dire_name,
                    value: dire_details,
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
    
    async loadInProgressLobbies() {
        const lobbies = await findAllInProgressLobbies();
        this.lobbies.push(...lobbies);
    }
    
    addLobby(lobbyOrState) {
        this.lobbies.push(lobbyOrState);
    }

    /**
     * The match polling loop
     * @async
     * @fires module:ihlManager~EVENT_MATCH_ENDED
     */
    async run() {
        logger.debug('matchTracker run');
        if (this.blocking) return;
        if (this.enabled && this.lobbies.length) {
            this.blocking = true;
            const lobbyOrState = this.lobbies.shift();
            const lobby = await setMatchDetails(lobbyOrState);
            if (lobby.odota_data && lobby.valve_data) {
                await setMatchPlayerDetails(lobby);
                this.emit(CONSTANTS.EVENT_MATCH_ENDED, lobby);
            }
            else {
                this.lobbies.push(lobby);
            }
            
            if (this.lobbies.length) {
                this.runTimer = setTimeout(this.run, this.interval);
            }
            this.blocking = false;
        }
    }

    /**
     * Enables the match polling loop
     * @async
     */
    enable() {
        logger.debug('matchTracker start');
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
    getOpenDotaMatchDetails,
    getValveMatchDetails,
    setMatchDetails,
    setMatchPlayerDetails,
    createMatchEndMessageEmbed,
    MatchTracker,
};
