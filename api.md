## Modules

<dl>
<dt><a href="#module_client">client</a></dt>
<dd></dd>
<dt><a href="#module_constants">constants</a></dt>
<dd></dd>
<dt><a href="#module_db">db</a></dt>
<dd></dd>
<dt><a href="#module_dotaBot">dotaBot</a></dt>
<dd></dd>
<dt><a href="#module_guild">guild</a></dt>
<dd></dd>
<dt><a href="#module_ihl">ihl</a></dt>
<dd></dd>
<dt><a href="#module_ihlManager">ihlManager</a></dt>
<dd></dd>
<dt><a href="#module_lobby">lobby</a></dt>
<dd></dd>
<dt><a href="#module_matchTracker">matchTracker</a></dt>
<dd></dd>
</dl>

## Classes

<dl>
<dt><a href="#Queue">Queue</a></dt>
<dd><p>Class representing a job queue with exponential backoff</p>
</dd>
</dl>

<a name="module_client"></a>

## client
<a name="module_constants"></a>

## constants
<a name="exp_module_constants--module.exports"></a>

### module.exports : <code>enum</code> ⏏
Enum for all constant values.

**Kind**: Exported enum  
**Read only**: true  
<a name="module_db"></a>

## db
<a name="module_dotaBot"></a>

## dotaBot

* [dotaBot](#module_dotaBot)
    * _static_
        * [.LogOnDetails](#module_dotaBot.LogOnDetails) : <code>Object</code>
    * _inner_
        * [~DotaBot](#module_dotaBot..DotaBot)
            * [new DotaBot(logOnDetails, debug, debugMore)](#new_module_dotaBot..DotaBot_new)
            * [.steamid_64](#module_dotaBot..DotaBot+steamid_64)
            * [.state](#module_dotaBot..DotaBot+state)
            * [.rate_limit](#module_dotaBot..DotaBot+rate_limit)
            * [.rate_limit](#module_dotaBot..DotaBot+rate_limit)
            * [.backoff](#module_dotaBot..DotaBot+backoff)
            * [.backoff](#module_dotaBot..DotaBot+backoff)
            * [.lobby](#module_dotaBot..DotaBot+lobby)
            * [.steamId](#module_dotaBot..DotaBot+steamId)
            * [.accountId](#module_dotaBot..DotaBot+accountId)
            * [.connect()](#module_dotaBot..DotaBot+connect)
            * [.disconnect()](#module_dotaBot..DotaBot+disconnect)
            * [.schedule()](#module_dotaBot..DotaBot+schedule)
        * [~slotToFaction(slot)](#module_dotaBot..slotToFaction) ⇒ <code>number</code>
        * [~updatePlayerState(steamid_64, slot, playerState)](#module_dotaBot..updatePlayerState) ⇒ <code>Object</code>
        * [~isDotaLobbyReady(factionCache, playerState)](#module_dotaBot..isDotaLobbyReady) ⇒ <code>boolean</code>

<a name="module_dotaBot.LogOnDetails"></a>

### dotaBot.LogOnDetails : <code>Object</code>
**Kind**: static typedef of [<code>dotaBot</code>](#module_dotaBot)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| account_name | <code>string</code> | The steam account name. |
| password | <code>string</code> | The steam account password. |
| persona_name | <code>string</code> | The steam account alias to use. |

<a name="module_dotaBot..DotaBot"></a>

### dotaBot~DotaBot
Class representing a Dota bot.
Handles all in game functions required to host an inhouse lobby.

**Kind**: inner class of [<code>dotaBot</code>](#module_dotaBot)  

* [~DotaBot](#module_dotaBot..DotaBot)
    * [new DotaBot(logOnDetails, debug, debugMore)](#new_module_dotaBot..DotaBot_new)
    * [.steamid_64](#module_dotaBot..DotaBot+steamid_64)
    * [.state](#module_dotaBot..DotaBot+state)
    * [.rate_limit](#module_dotaBot..DotaBot+rate_limit)
    * [.rate_limit](#module_dotaBot..DotaBot+rate_limit)
    * [.backoff](#module_dotaBot..DotaBot+backoff)
    * [.backoff](#module_dotaBot..DotaBot+backoff)
    * [.lobby](#module_dotaBot..DotaBot+lobby)
    * [.steamId](#module_dotaBot..DotaBot+steamId)
    * [.accountId](#module_dotaBot..DotaBot+accountId)
    * [.connect()](#module_dotaBot..DotaBot+connect)
    * [.disconnect()](#module_dotaBot..DotaBot+disconnect)
    * [.schedule()](#module_dotaBot..DotaBot+schedule)

<a name="new_module_dotaBot..DotaBot_new"></a>

#### new DotaBot(logOnDetails, debug, debugMore)
Constructor of the DotaBot. This prepares an object for connecting to
Steam and the Dota2 Game Coordinator.


| Param | Type | Description |
| --- | --- | --- |
| logOnDetails | [<code>LogOnDetails</code>](#module_dotaBot.LogOnDetails) | Steam login credentials. |
| debug | <code>boolean</code> | Whether or not debug info should be logged. |
| debugMore | <code>boolean</code> | Whether or not more debug info should be logged. |

<a name="module_dotaBot..DotaBot+steamid_64"></a>

#### dotaBot.steamid_64
Get bot steamid_64

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+state"></a>

#### dotaBot.state
Get the current state of the queue

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+rate_limit"></a>

#### dotaBot.rate_limit
Get the current rate limit factor

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+rate_limit"></a>

#### dotaBot.rate_limit
Set the rate limiting factor

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  

| Param | Type | Description |
| --- | --- | --- |
| rate_limit | <code>number</code> | Milliseconds to wait between requests. |

<a name="module_dotaBot..DotaBot+backoff"></a>

#### dotaBot.backoff
Get the current backoff time of the queue

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+backoff"></a>

#### dotaBot.backoff
Set the backoff time of the queue

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  

| Param | Type | Description |
| --- | --- | --- |
| backoff | <code>number</code> | Exponential backoff time in milliseconds. |

<a name="module_dotaBot..DotaBot+lobby"></a>

#### dotaBot.lobby
Get the dota lobby object

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+steamId"></a>

#### dotaBot.steamId
Get the bot steam id

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+accountId"></a>

#### dotaBot.accountId
Get the bot account id

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+connect"></a>

#### dotaBot.connect()
Initiates the connection to Steam and the Dota2 Game Coordinator.

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+disconnect"></a>

#### dotaBot.disconnect()
Disconnect from the Game Coordinator. This will also cancel all queued
operations!

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+schedule"></a>

#### dotaBot.schedule()
Schedule a function for execution. This function will be executed as soon
as the GC is available.

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..slotToFaction"></a>

### dotaBot~slotToFaction(slot) ⇒ <code>number</code>
Converts a Dota team slot value to a faction value.

**Kind**: inner method of [<code>dotaBot</code>](#module_dotaBot)  
**Returns**: <code>number</code> - An inhouse lobby faction.  

| Param | Type | Description |
| --- | --- | --- |
| slot | <code>number</code> | The Dota team slot. |

<a name="module_dotaBot..updatePlayerState"></a>

### dotaBot~updatePlayerState(steamid_64, slot, playerState) ⇒ <code>Object</code>
Updates a player to team mapping object.
Used to track which players have joined team slots in lobby.
A null slot value will remove the player from the mapping meaning they are not in a team slot.

**Kind**: inner method of [<code>dotaBot</code>](#module_dotaBot)  
**Returns**: <code>Object</code> - A player to team mapping.  

| Param | Type | Description |
| --- | --- | --- |
| steamid_64 | <code>string</code> | The player's steamid64. |
| slot | <code>number</code> | The lobby team slot the player joined. |
| playerState | <code>Object</code> | A player to team mapping. |

<a name="module_dotaBot..isDotaLobbyReady"></a>

### dotaBot~isDotaLobbyReady(factionCache, playerState) ⇒ <code>boolean</code>
Checks if all entries in a player to faction mapping match the player to team state mapping.

**Kind**: inner method of [<code>dotaBot</code>](#module_dotaBot)  
**Returns**: <code>boolean</code> - Whether the player state matches the faction cache.  

| Param | Type | Description |
| --- | --- | --- |
| factionCache | <code>Object</code> | The intended player to team state. |
| playerState | <code>Object</code> | The current state of players to teams. |

<a name="module_guild"></a>

## guild
<a name="module_ihl"></a>

## ihl

* [ihl](#module_ihl)
    * _static_
        * [.InhouseState](#module_ihl.InhouseState) : <code>Object</code>
    * _inner_
        * [~getUserRankTier(steamId64)](#module_ihl..getUserRankTier) ⇒ <code>number</code>
        * [~registerUser(guildId, steamId64, discordId)](#module_ihl..registerUser) ⇒ <code>User</code>
        * [~createInhouseState()](#module_ihl..createInhouseState) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
        * [~addLobbyToInhouse(_inhouseState, lobbyState)](#module_ihl..addLobbyToInhouse) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
        * [~createNewLobbyForInhouse(_inhouseState, eventEmitter, users)](#module_ihl..createNewLobbyForInhouse) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
        * [~removeLobbyFromInhouse(_inhouseState, lobbyName)](#module_ihl..removeLobbyFromInhouse) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
        * [~loadLobbiesIntoInhouse(_inhouseState)](#module_ihl..loadLobbiesIntoInhouse) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
        * [~runLobbiesForInhouse(_inhouseState)](#module_ihl..runLobbiesForInhouse) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
        * [~checkInhouseQueue(_inhouseState)](#module_ihl..checkInhouseQueue) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
        * [~joinInhouseQueue(_inhouseState, user, eventEmitter)](#module_ihl..joinInhouseQueue) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
        * [~leaveInhouseQueue(_inhouseState, user, eventEmitter)](#module_ihl..leaveInhouseQueue) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
        * [~banInhouseQueue(_inhouseState, user, eventEmitter)](#module_ihl..banInhouseQueue) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)

<a name="module_ihl.InhouseState"></a>

### ihl.InhouseState : <code>Object</code>
**Kind**: static typedef of [<code>ihl</code>](#module_ihl)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| guild | <code>Guild</code> | The discord guild the inhouse belongs to. |
| lobbies | [<code>Array.&lt;LobbyState&gt;</code>](#module_lobby.LobbyState) | A list of lobby states for the inhouse. |
| category | <code>Category</code> | The discord inhouse category. |
| channel | <code>Channel</code> | The discord inhouse general channel. |
| adminRole | <code>Role</code> | The discord inhouse admin role. |
| ready_check_timeout | <code>number</code> | Duration in milliseconds before lobby ready timeout. |
| captain_rank_threshold | <code>number</code> | Maximum rank difference between captains. |
| captain_role_regexp | <code>string</code> | Regular expression string for captain roles. |

<a name="module_ihl..getUserRankTier"></a>

### ihl~getUserRankTier(steamId64) ⇒ <code>number</code>
Gets a player's badge rank from opendota.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: <code>number</code> - The player badge rank.  

| Param | Type | Description |
| --- | --- | --- |
| steamId64 | <code>string</code> | The player's steamid64. |

<a name="module_ihl..registerUser"></a>

### ihl~registerUser(guildId, steamId64, discordId) ⇒ <code>User</code>
Adds a player to the inhouse league.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: <code>User</code> - The newly created user database record.  

| Param | Type | Description |
| --- | --- | --- |
| guildId | <code>string</code> | A guild id. |
| steamId64 | <code>string</code> | The player's steamid64. |
| discordId | <code>string</code> | The player's discord id. |

<a name="module_ihl..createInhouseState"></a>

### ihl~createInhouseState() ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
Creates an inhouse state.
Sets up the inhouse category, channel, and role.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: [<code>InhouseState</code>](#module_ihl.InhouseState) - An inhouse state object.  
<a name="module_ihl..addLobbyToInhouse"></a>

### ihl~addLobbyToInhouse(_inhouseState, lobbyState) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
Adds a lobby state to an inhouse state.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: [<code>InhouseState</code>](#module_ihl.InhouseState) - A new inhouse state with lobby state added to it.  

| Param | Type | Description |
| --- | --- | --- |
| _inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | An inhouse state. |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | The lobby state to add. |

<a name="module_ihl..createNewLobbyForInhouse"></a>

### ihl~createNewLobbyForInhouse(_inhouseState, eventEmitter, users) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
Creates a lobby and adds it to an inhouse state.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: [<code>InhouseState</code>](#module_ihl.InhouseState) - A new inhouse state with lobby state added to it.  

| Param | Type | Description |
| --- | --- | --- |
| _inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | An inhouse state. |
| eventEmitter | <code>EventEmitter</code> | The event listener object. |
| users | <code>Array.&lt;User&gt;</code> | The players that will be added to the lobby. |

<a name="module_ihl..removeLobbyFromInhouse"></a>

### ihl~removeLobbyFromInhouse(_inhouseState, lobbyName) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
Removes a lobby from an inhouse state.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: [<code>InhouseState</code>](#module_ihl.InhouseState) - A new inhouse state with lobby state removed from it.  

| Param | Type | Description |
| --- | --- | --- |
| _inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | An inhouse state. |
| lobbyName | <code>string</code> | The name of the lobby to remove. |

<a name="module_ihl..loadLobbiesIntoInhouse"></a>

### ihl~loadLobbiesIntoInhouse(_inhouseState) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
Loads active lobbies from the database into an inhouse state.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: [<code>InhouseState</code>](#module_ihl.InhouseState) - A new inhouse state with lobbies loaded in.  

| Param | Type | Description |
| --- | --- | --- |
| _inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | An inhouse state. |

<a name="module_ihl..runLobbiesForInhouse"></a>

### ihl~runLobbiesForInhouse(_inhouseState) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
Runs all lobbies in an inhouse state.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: [<code>InhouseState</code>](#module_ihl.InhouseState) - A new inhouse state with updated lobby states from being run.  

| Param | Type | Description |
| --- | --- | --- |
| _inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | An inhouse state. |

<a name="module_ihl..checkInhouseQueue"></a>

### ihl~checkInhouseQueue(_inhouseState) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
Runs all lobbies in an inhouse state.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: [<code>InhouseState</code>](#module_ihl.InhouseState) - A new inhouse state with updated lobby states from being run.  

| Param | Type | Description |
| --- | --- | --- |
| _inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | An inhouse state. |

<a name="module_ihl..joinInhouseQueue"></a>

### ihl~joinInhouseQueue(_inhouseState, user, eventEmitter) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
Adds a user to an inhouse queue.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: [<code>InhouseState</code>](#module_ihl.InhouseState) - A new inhouse state with updated lobby states from being run if queue popped.  

| Param | Type | Description |
| --- | --- | --- |
| _inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | An inhouse state. |
| user | <code>User</code> | The player to queue. |
| eventEmitter | <code>EventEmitter</code> | The event listener object. |

<a name="module_ihl..leaveInhouseQueue"></a>

### ihl~leaveInhouseQueue(_inhouseState, user, eventEmitter) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
Removes a user from an inhouse queue.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: [<code>InhouseState</code>](#module_ihl.InhouseState) - A new inhouse state.  

| Param | Type | Description |
| --- | --- | --- |
| _inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | An inhouse state. |
| user | <code>User</code> | The player to dequeue. |
| eventEmitter | <code>EventEmitter</code> | The event listener object. |

<a name="module_ihl..banInhouseQueue"></a>

### ihl~banInhouseQueue(_inhouseState, user, eventEmitter) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
Bans a user from an inhouse queue.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: [<code>InhouseState</code>](#module_ihl.InhouseState) - A new inhouse state.  

| Param | Type | Description |
| --- | --- | --- |
| _inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | An inhouse state. |
| user | <code>User</code> | The player to ban. |
| eventEmitter | <code>EventEmitter</code> | The event listener object. |

<a name="module_ihlManager"></a>

## ihlManager

* [ihlManager](#module_ihlManager)
    * [~IHLManager](#module_ihlManager..IHLManager)
        * [new IHLManager()](#new_module_ihlManager..IHLManager_new)
        * [.init(client)](#module_ihlManager..IHLManager+init)
        * [.createNewLeague(guild)](#module_ihlManager..IHLManager+createNewLeague)
        * [.createNewLobbyForInhouse(guild, steamid_64s)](#module_ihlManager..IHLManager+createNewLobbyForInhouse)
        * [.checkInhouseQueue(guild)](#module_ihlManager..IHLManager+checkInhouseQueue)
        * [.joinInhouseQueue(guild, user)](#module_ihlManager..IHLManager+joinInhouseQueue)
        * [.leaveInhouseQueue(guild, user)](#module_ihlManager..IHLManager+leaveInhouseQueue)
        * [.banInhouseQueue(guild, user, timeout)](#module_ihlManager..IHLManager+banInhouseQueue)
        * [.runLobby(_lobbyState, states)](#module_ihlManager..IHLManager+runLobby)
        * [.registerLobbyTimeout(_lobbyState)](#module_ihlManager..IHLManager+registerLobbyTimeout)
        * [.unregisterLobbyTimeout(_lobbyState)](#module_ihlManager..IHLManager+unregisterLobbyTimeout)
        * [.onLobbyTimedOut(_lobbyState)](#module_ihlManager..IHLManager+onLobbyTimedOut)
        * [.onPlayersReady(_lobbyState)](#module_ihlManager..IHLManager+onPlayersReady)
        * [.onPlayerReady(_lobbyState, user)](#module_ihlManager..IHLManager+onPlayerReady)
        * [.onDraftMember(msg, member)](#module_ihlManager..IHLManager+onDraftMember)
        * [.onLobbyReady(_lobbyState)](#module_ihlManager..IHLManager+onLobbyReady)
        * [.onMatchEnd(_lobbyState)](#module_ihlManager..IHLManager+onMatchEnd)
        * [.processEventQueue()](#module_ihlManager..IHLManager+processEventQueue)
        * [.queueEvent(fn, ...args)](#module_ihlManager..IHLManager+queueEvent)
        * [.attachEventHandlers()](#module_ihlManager..IHLManager+attachEventHandlers)
        * [.attachMessageHandlers()](#module_ihlManager..IHLManager+attachMessageHandlers)
    * [~ihlManager](#module_ihlManager..ihlManager) : <code>IHLManager</code>
    * [~findUser(guild, member)](#module_ihlManager..findUser) ⇒ <code>Array</code>
    * [~getInhouseState(inhouseStates, guildId)](#module_ihlManager..getInhouseState) ⇒ <code>number</code>
    * [~getIndexOfInhouseState(inhouseStates, guildId)](#module_ihlManager..getIndexOfInhouseState) ⇒ <code>number</code>
    * [~transformLeagueGuild(guilds, league)](#module_ihlManager..transformLeagueGuild) ⇒ <code>Object</code>
    * [~addInhouseState(inhouseStates, inhouseState)](#module_ihlManager..addInhouseState) ⇒ [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState)
    * [~loadInhouseState(eventEmitter, guilds, league)](#module_ihlManager..loadInhouseState) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
    * [~loadInhouseStates(eventEmitter, guilds, leagues)](#module_ihlManager..loadInhouseStates) ⇒ [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState)
    * [~loadInhouseStatesFromLeagues(eventEmitter, guilds)](#module_ihlManager..loadInhouseStatesFromLeagues) ⇒ [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState)
    * [~getLobbyByChannelId(inhouseStates, guildId, channelId)](#module_ihlManager..getLobbyByChannelId) ⇒ [<code>LobbyState</code>](#module_lobby.LobbyState)
    * [~getLobbyByLobbyName(inhouseStates, lobby_name)](#module_ihlManager..getLobbyByLobbyName) ⇒ [<code>LobbyState</code>](#module_lobby.LobbyState)
    * [~isMessageFromAdmin(inhouseStates, msg)](#module_ihlManager..isMessageFromAdmin) ⇒ <code>boolean</code>
    * [~getLobbyFromMessage(inhouseStates, msg)](#module_ihlManager..getLobbyFromMessage) ⇒ [<code>LobbyState</code>](#module_lobby.LobbyState)
    * [~eventCallback](#module_ihlManager..eventCallback) : <code>function</code>

<a name="module_ihlManager..IHLManager"></a>

### ihlManager~IHLManager
Class representing the inhouse league manager.

**Kind**: inner class of [<code>ihlManager</code>](#module_ihlManager)  

* [~IHLManager](#module_ihlManager..IHLManager)
    * [new IHLManager()](#new_module_ihlManager..IHLManager_new)
    * [.init(client)](#module_ihlManager..IHLManager+init)
    * [.createNewLeague(guild)](#module_ihlManager..IHLManager+createNewLeague)
    * [.createNewLobbyForInhouse(guild, steamid_64s)](#module_ihlManager..IHLManager+createNewLobbyForInhouse)
    * [.checkInhouseQueue(guild)](#module_ihlManager..IHLManager+checkInhouseQueue)
    * [.joinInhouseQueue(guild, user)](#module_ihlManager..IHLManager+joinInhouseQueue)
    * [.leaveInhouseQueue(guild, user)](#module_ihlManager..IHLManager+leaveInhouseQueue)
    * [.banInhouseQueue(guild, user, timeout)](#module_ihlManager..IHLManager+banInhouseQueue)
    * [.runLobby(_lobbyState, states)](#module_ihlManager..IHLManager+runLobby)
    * [.registerLobbyTimeout(_lobbyState)](#module_ihlManager..IHLManager+registerLobbyTimeout)
    * [.unregisterLobbyTimeout(_lobbyState)](#module_ihlManager..IHLManager+unregisterLobbyTimeout)
    * [.onLobbyTimedOut(_lobbyState)](#module_ihlManager..IHLManager+onLobbyTimedOut)
    * [.onPlayersReady(_lobbyState)](#module_ihlManager..IHLManager+onPlayersReady)
    * [.onPlayerReady(_lobbyState, user)](#module_ihlManager..IHLManager+onPlayerReady)
    * [.onDraftMember(msg, member)](#module_ihlManager..IHLManager+onDraftMember)
    * [.onLobbyReady(_lobbyState)](#module_ihlManager..IHLManager+onLobbyReady)
    * [.onMatchEnd(_lobbyState)](#module_ihlManager..IHLManager+onMatchEnd)
    * [.processEventQueue()](#module_ihlManager..IHLManager+processEventQueue)
    * [.queueEvent(fn, ...args)](#module_ihlManager..IHLManager+queueEvent)
    * [.attachEventHandlers()](#module_ihlManager..IHLManager+attachEventHandlers)
    * [.attachMessageHandlers()](#module_ihlManager..IHLManager+attachMessageHandlers)

<a name="new_module_ihlManager..IHLManager_new"></a>

#### new IHLManager()
Creates an inhouse league manager.

<a name="module_ihlManager..IHLManager+init"></a>

#### ihlManager.init(client)
Initializes the inhouse league manager with a discord client and loads inhouse states for each league.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Client</code> | A discord.js client. |

<a name="module_ihlManager..IHLManager+createNewLeague"></a>

#### ihlManager.createNewLeague(guild)
Creates a new inhouse league and adds the inhouse state to list of inhouse states.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Guild</code> | A discord.js guild. |

<a name="module_ihlManager..IHLManager+createNewLobbyForInhouse"></a>

#### ihlManager.createNewLobbyForInhouse(guild, steamid_64s)
Creates a new inhouse lobby.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Guild</code> | A discord.js guild. |
| steamid_64s | <code>Array.&lt;string&gt;</code> | A list of inhouse player steamids. |

<a name="module_ihlManager..IHLManager+checkInhouseQueue"></a>

#### ihlManager.checkInhouseQueue(guild)
Checks the inhouse queue.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Guild</code> | A discord.js guild. |

<a name="module_ihlManager..IHLManager+joinInhouseQueue"></a>

#### ihlManager.joinInhouseQueue(guild, user)
Adds a user to the inhouse queue.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Guild</code> | A discord.js guild. |
| user | <code>User</code> | A discord.js user. |

<a name="module_ihlManager..IHLManager+leaveInhouseQueue"></a>

#### ihlManager.leaveInhouseQueue(guild, user)
Removes a user from the inhouse queue.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Guild</code> | A discord.js guild. |
| user | <code>User</code> | A discord.js user. |

<a name="module_ihlManager..IHLManager+banInhouseQueue"></a>

#### ihlManager.banInhouseQueue(guild, user, timeout)
Bans a user from the inhouse queue.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Guild</code> | A discord.js guild. |
| user | <code>User</code> | A discord.js user. |
| timeout | <code>number</code> | Duration of ban in minutes. |

<a name="module_ihlManager..IHLManager+runLobby"></a>

#### ihlManager.runLobby(_lobbyState, states)
Processes and executes a lobby state if it matches any of the given states.
If no states to match against are given, the lobby state is run by default.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |
| states | <code>Array.&lt;string&gt;</code> | A list of valid lobby states. |

<a name="module_ihlManager..IHLManager+registerLobbyTimeout"></a>

#### ihlManager.registerLobbyTimeout(_lobbyState)
Creates and registers a ready up timer for a lobby state.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |

<a name="module_ihlManager..IHLManager+unregisterLobbyTimeout"></a>

#### ihlManager.unregisterLobbyTimeout(_lobbyState)
Clears and unregisters the ready up timer for a lobby state.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |

<a name="module_ihlManager..IHLManager+onLobbyTimedOut"></a>

#### ihlManager.onLobbyTimedOut(_lobbyState)
Runs a lobby state when its ready up timer has expired.
Checks for STATE_CHECKING_READY lobby state

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |

<a name="module_ihlManager..IHLManager+onPlayersReady"></a>

#### ihlManager.onPlayersReady(_lobbyState)
Runs a lobby state when all players have readied up.
Checks for STATE_CHECKING_READY lobby state

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |

<a name="module_ihlManager..IHLManager+onPlayerReady"></a>

#### ihlManager.onPlayerReady(_lobbyState, user)
Runs a lobby state when a player has readied up and update their player ready state.
Checks for STATE_CHECKING_READY lobby state

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |
| user | <code>User</code> | An inhouse user. |

<a name="module_ihlManager..IHLManager+onDraftMember"></a>

#### ihlManager.onDraftMember(msg, member)
Checks if a player is draftable and fires an event representing the result.
If the player is draftable, checks for STATE_DRAFTING_PLAYERS lobby state and runs the lobby state.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Message</code> | A discord.js message. |
| member | <code>GuildMember</code> | A discord.js guild member. |

<a name="module_ihlManager..IHLManager+onLobbyReady"></a>

#### ihlManager.onLobbyReady(_lobbyState)
Runs a lobby state when the lobby is ready (all players have joined and are in the right team slot).
Checks for STATE_WAITING_FOR_PLAYERS lobby state

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |

<a name="module_ihlManager..IHLManager+onMatchEnd"></a>

#### ihlManager.onMatchEnd(_lobbyState)
Runs a lobby state when the match has ended.
Checks for STATE_MATCH_IN_PROGRESS lobby state

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |

<a name="module_ihlManager..IHLManager+processEventQueue"></a>

#### ihlManager.processEventQueue()
Processes the inhouse manager event queue until it is empty.
Events are actions to perform on lobby states.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  
<a name="module_ihlManager..IHLManager+queueEvent"></a>

#### ihlManager.queueEvent(fn, ...args)
Adds a lobby processing function and its arguments to the queue.
When the queue is processed the function will be executed with its arguments.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| fn | <code>eventCallback</code> | A lobby processing event function. |
| ...args | <code>\*</code> | A list of arguments the lobby processing event function will be called with. |

<a name="module_ihlManager..IHLManager+attachEventHandlers"></a>

#### ihlManager.attachEventHandlers()
Bind all lobby events to their corresponding event handler functions

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  
<a name="module_ihlManager..IHLManager+attachMessageHandlers"></a>

#### ihlManager.attachMessageHandlers()
Bind all message events to their corresponding event handler functions

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  
<a name="module_ihlManager..ihlManager"></a>

### ihlManager~ihlManager : <code>IHLManager</code>
A singleton instance of IHLManager that is exported by this module.

**Kind**: inner constant of [<code>ihlManager</code>](#module_ihlManager)  
<a name="module_ihlManager..findUser"></a>

### ihlManager~findUser(guild, member) ⇒ <code>Array</code>
Searches the discord guild for a member.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: <code>Array</code> - The search result in an array containing the user record, discord guild member, and type of match.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Guild</code> | A list of guilds to initialize leagues with. |
| member | <code>string</code> \| <code>GuildMember</code> | A name or search string for an inhouse player or their guild member instance. |

<a name="module_ihlManager..getInhouseState"></a>

### ihlManager~getInhouseState(inhouseStates, guildId) ⇒ <code>number</code>
Gets the inhouse state with the given guild id in a list of inhouse states.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: <code>number</code> - The inhouse state in inhouseStates. Returns undefined if no inhouse state with the guild id exists.  

| Param | Type | Description |
| --- | --- | --- |
| inhouseStates | [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState) | A list of inhouse states. |
| guildId | <code>string</code> | A guild id. |

<a name="module_ihlManager..getIndexOfInhouseState"></a>

### ihlManager~getIndexOfInhouseState(inhouseStates, guildId) ⇒ <code>number</code>
Gets the index of an inhouse state with the given guild id in a list of inhouse states.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: <code>number</code> - The index of the inhouse state in inhouseStates. Returns -1 if no inhouse state with the guild id exists.  

| Param | Type | Description |
| --- | --- | --- |
| inhouseStates | [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState) | A list of inhouse states. |
| guildId | <code>string</code> | A guild id. |

<a name="module_ihlManager..transformLeagueGuild"></a>

### ihlManager~transformLeagueGuild(guilds, league) ⇒ <code>Object</code>
Takes a list of guilds and a league record and turns it into an object containing both.
Transforms the input into an object that can be passed to createInhouseState.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: <code>Object</code> - An object containing the league and its guild.  

| Param | Type | Description |
| --- | --- | --- |
| guilds | <code>Array.&lt;Guild&gt;</code> | A list of guilds to initialize leagues with. |
| league | <code>League</code> | A database league record. |

<a name="module_ihlManager..addInhouseState"></a>

### ihlManager~addInhouseState(inhouseStates, inhouseState) ⇒ [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState)
Adds an inhouse state to a list of inhouse states.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState) - A new list of inhouse states with the inhouse state added to it.  

| Param | Type | Description |
| --- | --- | --- |
| inhouseStates | [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState) | A list of inhouse states. |
| inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | The inhouse state to add. |

<a name="module_ihlManager..loadInhouseState"></a>

### ihlManager~loadInhouseState(eventEmitter, guilds, league) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
Maps a league record to an inhouse state.
All inhouse lobbies are loaded and run.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: [<code>InhouseState</code>](#module_ihl.InhouseState) - The inhouse state loaded from a league record.  

| Param | Type | Description |
| --- | --- | --- |
| eventEmitter | <code>EventEmitter</code> | The event listener object. |
| guilds | <code>Array.&lt;Guild&gt;</code> | A list of guilds to initialize leagues with. |
| league | <code>League</code> | A database league record. |

<a name="module_ihlManager..loadInhouseStates"></a>

### ihlManager~loadInhouseStates(eventEmitter, guilds, leagues) ⇒ [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState)
Maps league records to inhouse states.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState) - The inhouse states loaded from league records.  

| Param | Type | Description |
| --- | --- | --- |
| eventEmitter | <code>EventEmitter</code> | The event listener object. |
| guilds | <code>Array.&lt;Guild&gt;</code> | A list of guilds to initialize leagues with. |
| leagues | <code>Array.&lt;League&gt;</code> | A list of database league records. |

<a name="module_ihlManager..loadInhouseStatesFromLeagues"></a>

### ihlManager~loadInhouseStatesFromLeagues(eventEmitter, guilds) ⇒ [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState)
Gets all league records from the database turns them into inhouse states.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState) - The inhouse states loaded from all league records.  

| Param | Type | Description |
| --- | --- | --- |
| eventEmitter | <code>EventEmitter</code> | The event listener object. |
| guilds | <code>Array.&lt;Guild&gt;</code> | A list of guilds to initialize leagues with. |

<a name="module_ihlManager..getLobbyByChannelId"></a>

### ihlManager~getLobbyByChannelId(inhouseStates, guildId, channelId) ⇒ [<code>LobbyState</code>](#module_lobby.LobbyState)
Gets a lobby state by its channel id.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: [<code>LobbyState</code>](#module_lobby.LobbyState) - The lobby state corresponding to the guild and channel.  

| Param | Type | Description |
| --- | --- | --- |
| inhouseStates | [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState) | A list of inhouse states. |
| guildId | <code>string</code> | The id of the guild for the lobby. |
| channelId | <code>string</code> | The id of the channel for the lobby. |

<a name="module_ihlManager..getLobbyByLobbyName"></a>

### ihlManager~getLobbyByLobbyName(inhouseStates, lobby_name) ⇒ [<code>LobbyState</code>](#module_lobby.LobbyState)
Gets a lobby state by its lobby name from a list of inhouse states.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: [<code>LobbyState</code>](#module_lobby.LobbyState) - The lobby state with the given lobby name.  

| Param | Type | Description |
| --- | --- | --- |
| inhouseStates | [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState) | A list of inhouse states. |
| lobby_name | <code>string</code> | The name of the lobby being looked for. |

<a name="module_ihlManager..isMessageFromAdmin"></a>

### ihlManager~isMessageFromAdmin(inhouseStates, msg) ⇒ <code>boolean</code>
Checks if a message was sent by an inhouse admin.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: <code>boolean</code> - Whether the message author is an inhouse admin.  

| Param | Type | Description |
| --- | --- | --- |
| inhouseStates | [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState) | A list of inhouse states. |
| msg | <code>Message</code> | A discord message sent from a lobby channel. |

<a name="module_ihlManager..getLobbyFromMessage"></a>

### ihlManager~getLobbyFromMessage(inhouseStates, msg) ⇒ [<code>LobbyState</code>](#module_lobby.LobbyState)
Gets a lobby state from a discord message.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: [<code>LobbyState</code>](#module_lobby.LobbyState) - The lobby state corresponding to the channel the message was posted in.  

| Param | Type | Description |
| --- | --- | --- |
| inhouseStates | [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState) | A list of inhouse states. |
| msg | <code>Message</code> | A discord message sent from a lobby channel. |

<a name="module_ihlManager..eventCallback"></a>

### ihlManager~eventCallback : <code>function</code>
Callback for a lobby processing event.

**Kind**: inner typedef of [<code>ihlManager</code>](#module_ihlManager)  
<a name="module_lobby"></a>

## lobby
<a name="module_lobby.LobbyState"></a>

### lobby.LobbyState : <code>Object</code>
**Kind**: static typedef of [<code>lobby</code>](#module_lobby)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| guild | <code>Guild</code> | The discord guild the lobby belongs to. |
| category | <code>Category</code> | The discord inhouse category. |
| channel | <code>Channel</code> | The discord lobby channel. |
| role | <code>Role</code> | The discord lobby role. |
| ready_check_timeout | <code>number</code> | Duration in milliseconds before lobby ready timeout. |
| captain_rank_threshold | <code>number</code> | Maximum rank difference between captains. |
| captain_role_regexp | <code>string</code> | Regular expression string for captain roles. |
| state | <code>string</code> | The lobby state. |
| bot_id | <code>number</code> | The record id of the bot hosting the lobby. |
| lobby_name | <code>string</code> | The lobby name. |
| lobby_id | <code>string</code> | The in-game lobby id. |
| password | <code>string</code> | The lobby password. |
| captain_1 | <code>string</code> | The first captain steamid64. |
| captain_2 | <code>string</code> | The second captain steamid64. |
| match_id | <code>string</code> | The match id for the lobby. |

<a name="module_matchTracker"></a>

## matchTracker

* [matchTracker](#module_matchTracker)
    * [~MatchTracker](#module_matchTracker..MatchTracker)
        * [new MatchTracker(eventEmitter)](#new_module_matchTracker..MatchTracker_new)
        * [.run()](#module_matchTracker..MatchTracker+run)
        * [.start()](#module_matchTracker..MatchTracker+start)
        * [.stop()](#module_matchTracker..MatchTracker+stop)

<a name="module_matchTracker..MatchTracker"></a>

### matchTracker~MatchTracker
Match tracker checks opendota and valve match apis to see if a match has finished
and saves the match data to the database.

**Kind**: inner class of [<code>matchTracker</code>](#module_matchTracker)  

* [~MatchTracker](#module_matchTracker..MatchTracker)
    * [new MatchTracker(eventEmitter)](#new_module_matchTracker..MatchTracker_new)
    * [.run()](#module_matchTracker..MatchTracker+run)
    * [.start()](#module_matchTracker..MatchTracker+start)
    * [.stop()](#module_matchTracker..MatchTracker+stop)

<a name="new_module_matchTracker..MatchTracker_new"></a>

#### new MatchTracker(eventEmitter)
Creates an inhouse league match tracker.


| Param | Type | Description |
| --- | --- | --- |
| eventEmitter | <code>EventEmitter</code> | The event listener object. |

<a name="module_matchTracker..MatchTracker+run"></a>

#### matchTracker.run()
The match polling loop

**Kind**: instance method of [<code>MatchTracker</code>](#module_matchTracker..MatchTracker)  
<a name="module_matchTracker..MatchTracker+start"></a>

#### matchTracker.start()
Starts the match polling loop

**Kind**: instance method of [<code>MatchTracker</code>](#module_matchTracker..MatchTracker)  
<a name="module_matchTracker..MatchTracker+stop"></a>

#### matchTracker.stop()
Stops the match polling loop

**Kind**: instance method of [<code>MatchTracker</code>](#module_matchTracker..MatchTracker)  
<a name="Queue"></a>

## Queue
Class representing a job queue with exponential backoff

**Kind**: global class  

* [Queue](#Queue)
    * [new Queue(backoff, rate_limit, debug)](#new_Queue_new)
    * [.state](#Queue+state)
    * [.rate_limit](#Queue+rate_limit)
    * [.rate_limit](#Queue+rate_limit)
    * [.backoff](#Queue+backoff)
    * [.backoff](#Queue+backoff)
    * [.schedule(job)](#Queue+schedule)
    * [.block()](#Queue+block)
    * [.release()](#Queue+release)
    * [.clear()](#Queue+clear)

<a name="new_Queue_new"></a>

### new Queue(backoff, rate_limit, debug)
Creates a queue with the given backoff parameter


| Param | Type | Description |
| --- | --- | --- |
| backoff | <code>number</code> | Base backoff time in milliseconds. |
| rate_limit | <code>number</code> | Milliseconds to wait between requests. |
| debug | <code>boolean</code> | Whether or not debug info should be logged. |

<a name="Queue+state"></a>

### queue.state
Get the current state of the queue

**Kind**: instance property of [<code>Queue</code>](#Queue)  
<a name="Queue+rate_limit"></a>

### queue.rate_limit
Get the rate_limit

**Kind**: instance property of [<code>Queue</code>](#Queue)  
<a name="Queue+rate_limit"></a>

### queue.rate_limit
Set the rate-limit

**Kind**: instance property of [<code>Queue</code>](#Queue)  

| Param | Type | Description |
| --- | --- | --- |
| rate_limit | <code>number</code> | Milliseconds to wait between requests. |

<a name="Queue+backoff"></a>

### queue.backoff
Get the backoff rate

**Kind**: instance property of [<code>Queue</code>](#Queue)  
<a name="Queue+backoff"></a>

### queue.backoff
Set the backoff rate

**Kind**: instance property of [<code>Queue</code>](#Queue)  

| Param | Type | Description |
| --- | --- | --- |
| backoff | <code>number</code> | Exponential backoff time in milliseconds. |

<a name="Queue+schedule"></a>

### queue.schedule(job)
Schedule a job for execution

**Kind**: instance method of [<code>Queue</code>](#Queue)  

| Param | Type | Description |
| --- | --- | --- |
| job | <code>function</code> | Function that needs to be executed |

<a name="Queue+block"></a>

### queue.block()
Block job execution

**Kind**: instance method of [<code>Queue</code>](#Queue)  
<a name="Queue+release"></a>

### queue.release()
Start job execution

**Kind**: instance method of [<code>Queue</code>](#Queue)  
<a name="Queue+clear"></a>

### queue.clear()
Deletes all the jobs from the queue

**Kind**: instance method of [<code>Queue</code>](#Queue)  
