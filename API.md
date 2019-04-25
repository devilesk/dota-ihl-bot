## Modules

<dl>
<dt><a href="#module_constants">constants</a></dt>
<dd></dd>
<dt><a href="#module_db">db</a></dt>
<dd><p>Database functions</p>
</dd>
<dt><a href="#module_dotaBot">dotaBot</a></dt>
<dd><p>Dota bot functions</p>
</dd>
<dt><a href="#module_guild">guild</a></dt>
<dd></dd>
<dt><a href="#module_ihl">ihl</a></dt>
<dd></dd>
<dt><a href="#module_ihlCommand">ihlCommand</a></dt>
<dd></dd>
<dt><a href="#module_ihlManager">ihlManager</a></dt>
<dd></dd>
<dt><a href="#module_lobby">lobby</a></dt>
<dd></dd>
<dt><a href="#module_matchTracker">matchTracker</a></dt>
<dd></dd>
</dl>

<a name="module_constants"></a>

## constants
<a name="module_constants.CONSTANTS"></a>

### constants.CONSTANTS : <code>enum</code>
Enum for all constant values.

**Kind**: static enum of [<code>constants</code>](#module_constants)  
**Read only**: true  
<a name="module_db"></a>

## db
Database functions


* [db](#module_db)
    * [~sequelize](#external_sequelize)
        * [.Model](#external_sequelize.Model)
            * [new Model()](#new_external_sequelize.Model_new)

<a name="external_sequelize"></a>

### db~sequelize
External namespace for discord.js classes.

**Kind**: inner external of [<code>db</code>](#module_db)  
**Category**: Sequelize  
**See**: [http://docs.sequelizejs.com/](http://docs.sequelizejs.com/)  

* [~sequelize](#external_sequelize)
    * [.Model](#external_sequelize.Model)
        * [new Model()](#new_external_sequelize.Model_new)

<a name="external_sequelize.Model"></a>

#### sequelize.Model
**Kind**: static class of [<code>sequelize</code>](#external_sequelize)  
**Category**: Sequelize  
**See**: [http://docs.sequelizejs.com/class/lib/model.js~Model.html](http://docs.sequelizejs.com/class/lib/model.js~Model.html)  
<a name="new_external_sequelize.Model_new"></a>

##### new Model()
External Sequelize Model class.

<a name="module_dotaBot"></a>

## dotaBot
Dota bot functions


* [dotaBot](#module_dotaBot)
    * [~DotaBot](#module_dotaBot..DotaBot) ⇐ [<code>EventEmitter</code>](#external_EventEmitter)
        * [new DotaBot(steamClient, steamUser, steamFriends, dotaClient, config)](#new_module_dotaBot..DotaBot_new)
        * [.teamCache](#module_dotaBot..DotaBot+teamCache) ⇒ <code>object</code>
        * [.teamCache](#module_dotaBot..DotaBot+teamCache)
        * [.steamId64](#module_dotaBot..DotaBot+steamId64) ⇒ <code>string</code>
        * [.lobby](#module_dotaBot..DotaBot+lobby) ⇒ <code>object</code>
        * [.dotaLobbyId](#module_dotaBot..DotaBot+dotaLobbyId) ⇒ [<code>Long</code>](#external_Long)
        * [.playerState](#module_dotaBot..DotaBot+playerState) ⇒ <code>object</code>
        * [.lobbyChannelName](#module_dotaBot..DotaBot+lobbyChannelName) ⇒ <code>string</code>
        * [.accountId](#module_dotaBot..DotaBot+accountId) ⇒ <code>number</code>
        * [.state](#module_dotaBot..DotaBot+state) ⇒ <code>string</code>
        * [.rateLimit](#module_dotaBot..DotaBot+rateLimit) ⇒ <code>number</code>
        * [.rateLimit](#module_dotaBot..DotaBot+rateLimit)
        * [.backoff](#module_dotaBot..DotaBot+backoff) ⇒ <code>number</code>
        * [.backoff](#module_dotaBot..DotaBot+backoff)
        * [.schedule()](#module_dotaBot..DotaBot+schedule)
        * [.block()](#module_dotaBot..DotaBot+block)
        * [.release()](#module_dotaBot..DotaBot+release)
        * [.clear()](#module_dotaBot..DotaBot+clear)
        * [.onSteamClientLoggedOff()](#module_dotaBot..DotaBot+onSteamClientLoggedOff)
        * [.onSteamClientError()](#module_dotaBot..DotaBot+onSteamClientError)
        * [.onDotaReady()](#module_dotaBot..DotaBot+onDotaReady)
        * [.onDotaUnready()](#module_dotaBot..DotaBot+onDotaUnready)
        * [.connect()](#module_dotaBot..DotaBot+connect)
        * [.logOnToSteam()](#module_dotaBot..DotaBot+logOnToSteam)
        * [.connectToDota()](#module_dotaBot..DotaBot+connectToDota)
        * [.disconnect()](#module_dotaBot..DotaBot+disconnect)
        * [.inviteToLobby(steamId64)](#module_dotaBot..DotaBot+inviteToLobby)
        * [.practiceLobbyKickFromTeam(accountId)](#module_dotaBot..DotaBot+practiceLobbyKickFromTeam)
        * [.practiceLobbyKick(accountId)](#module_dotaBot..DotaBot+practiceLobbyKick)
        * [.joinPracticeLobby(dotaLobbyId)](#module_dotaBot..DotaBot+joinPracticeLobby)
    * [~slotToTeam(slot)](#module_dotaBot..slotToTeam) ⇒ <code>number</code>
    * [~updatePlayerState(steamId64, slot, playerState)](#module_dotaBot..updatePlayerState) ⇒ <code>Object</code>
    * [~isDotaLobbyReady(teamCache, playerState)](#module_dotaBot..isDotaLobbyReady) ⇒ <code>boolean</code>
    * [~startDotaLobby(dotaBot)](#module_dotaBot..startDotaLobby) ⇒ <code>string</code>
    * _Other_
        * [~Long](#external_Long)
    * _node-dota2_
        * [~Dota2](#external_Dota2)
            * [.Dota2Client](#external_Dota2.Dota2Client)
                * [new Dota2Client()](#new_external_Dota2.Dota2Client_new)
    * _node-steam_
        * [~steam](#external_steam)
            * [.SteamClient](#external_steam.SteamClient)
                * [new SteamClient()](#new_external_steam.SteamClient_new)
            * [.SteamUser](#external_steam.SteamUser)
                * [new SteamUser()](#new_external_steam.SteamUser_new)
            * [.SteamFriends](#external_steam.SteamFriends)
                * [new SteamFriends()](#new_external_steam.SteamFriends_new)

<a name="module_dotaBot..DotaBot"></a>

### dotaBot~DotaBot ⇐ [<code>EventEmitter</code>](#external_EventEmitter)
Class representing a Dota bot.
Handles all in game functions required to host an inhouse lobby.

**Kind**: inner class of [<code>dotaBot</code>](#module_dotaBot)  
**Extends**: [<code>EventEmitter</code>](#external_EventEmitter)  

* [~DotaBot](#module_dotaBot..DotaBot) ⇐ [<code>EventEmitter</code>](#external_EventEmitter)
    * [new DotaBot(steamClient, steamUser, steamFriends, dotaClient, config)](#new_module_dotaBot..DotaBot_new)
    * [.teamCache](#module_dotaBot..DotaBot+teamCache) ⇒ <code>object</code>
    * [.teamCache](#module_dotaBot..DotaBot+teamCache)
    * [.steamId64](#module_dotaBot..DotaBot+steamId64) ⇒ <code>string</code>
    * [.lobby](#module_dotaBot..DotaBot+lobby) ⇒ <code>object</code>
    * [.dotaLobbyId](#module_dotaBot..DotaBot+dotaLobbyId) ⇒ [<code>Long</code>](#external_Long)
    * [.playerState](#module_dotaBot..DotaBot+playerState) ⇒ <code>object</code>
    * [.lobbyChannelName](#module_dotaBot..DotaBot+lobbyChannelName) ⇒ <code>string</code>
    * [.accountId](#module_dotaBot..DotaBot+accountId) ⇒ <code>number</code>
    * [.state](#module_dotaBot..DotaBot+state) ⇒ <code>string</code>
    * [.rateLimit](#module_dotaBot..DotaBot+rateLimit) ⇒ <code>number</code>
    * [.rateLimit](#module_dotaBot..DotaBot+rateLimit)
    * [.backoff](#module_dotaBot..DotaBot+backoff) ⇒ <code>number</code>
    * [.backoff](#module_dotaBot..DotaBot+backoff)
    * [.schedule()](#module_dotaBot..DotaBot+schedule)
    * [.block()](#module_dotaBot..DotaBot+block)
    * [.release()](#module_dotaBot..DotaBot+release)
    * [.clear()](#module_dotaBot..DotaBot+clear)
    * [.onSteamClientLoggedOff()](#module_dotaBot..DotaBot+onSteamClientLoggedOff)
    * [.onSteamClientError()](#module_dotaBot..DotaBot+onSteamClientError)
    * [.onDotaReady()](#module_dotaBot..DotaBot+onDotaReady)
    * [.onDotaUnready()](#module_dotaBot..DotaBot+onDotaUnready)
    * [.connect()](#module_dotaBot..DotaBot+connect)
    * [.logOnToSteam()](#module_dotaBot..DotaBot+logOnToSteam)
    * [.connectToDota()](#module_dotaBot..DotaBot+connectToDota)
    * [.disconnect()](#module_dotaBot..DotaBot+disconnect)
    * [.inviteToLobby(steamId64)](#module_dotaBot..DotaBot+inviteToLobby)
    * [.practiceLobbyKickFromTeam(accountId)](#module_dotaBot..DotaBot+practiceLobbyKickFromTeam)
    * [.practiceLobbyKick(accountId)](#module_dotaBot..DotaBot+practiceLobbyKick)
    * [.joinPracticeLobby(dotaLobbyId)](#module_dotaBot..DotaBot+joinPracticeLobby)

<a name="new_module_dotaBot..DotaBot_new"></a>

#### new DotaBot(steamClient, steamUser, steamFriends, dotaClient, config)
Constructor of the DotaBot. This prepares an object for connecting to
Steam and the Dota2 Game Coordinator.


| Param | Type | Description |
| --- | --- | --- |
| steamClient | [<code>SteamClient</code>](#external_steam.SteamClient) | A SteamClient instance. |
| steamUser | [<code>SteamUser</code>](#external_steam.SteamUser) | A SteamUser instance. |
| steamFriends | [<code>SteamFriends</code>](#external_steam.SteamFriends) | A SteamFriends instance. |
| dotaClient | [<code>Dota2Client</code>](#external_Dota2.Dota2Client) | A Dota2Client instance. |
| config | <code>module:db.Bot</code> | Bot configuration object. |

<a name="module_dotaBot..DotaBot+teamCache"></a>

#### dotaBot.teamCache ⇒ <code>object</code>
Get the player to team mapping object

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
**Returns**: <code>object</code> - The player to team mapping object.  
<a name="module_dotaBot..DotaBot+teamCache"></a>

#### dotaBot.teamCache
Set the player to team mapping object

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  

| Param | Type | Description |
| --- | --- | --- |
| newCache | <code>object</code> | The new player to team mapping object. |

<a name="module_dotaBot..DotaBot+steamId64"></a>

#### dotaBot.steamId64 ⇒ <code>string</code>
Get bot steamId64

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
**Returns**: <code>string</code> - The bot steam 64 id.  
<a name="module_dotaBot..DotaBot+lobby"></a>

#### dotaBot.lobby ⇒ <code>object</code>
Get the dota lobby object

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
**Returns**: <code>object</code> - The current lobby state  
<a name="module_dotaBot..DotaBot+dotaLobbyId"></a>

#### dotaBot.dotaLobbyId ⇒ [<code>Long</code>](#external_Long)
Get the dota lobby id

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
**Returns**: [<code>Long</code>](#external_Long) - The id of the current lobby.  
<a name="module_dotaBot..DotaBot+playerState"></a>

#### dotaBot.playerState ⇒ <code>object</code>
Get the dota lobby player state

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
**Returns**: <code>object</code> - The current lobby player state  
<a name="module_dotaBot..DotaBot+lobbyChannelName"></a>

#### dotaBot.lobbyChannelName ⇒ <code>string</code>
Get the dota lobby channel name

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
**Returns**: <code>string</code> - The channel name of the current lobby.  
<a name="module_dotaBot..DotaBot+accountId"></a>

#### dotaBot.accountId ⇒ <code>number</code>
Get the bot account id

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
**Returns**: <code>number</code> - The account id.  
<a name="module_dotaBot..DotaBot+state"></a>

#### dotaBot.state ⇒ <code>string</code>
Get the current state of the queue

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
**Returns**: <code>string</code> - The current state of the queue.  
<a name="module_dotaBot..DotaBot+rateLimit"></a>

#### dotaBot.rateLimit ⇒ <code>number</code>
Get the current rate limit factor

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
**Returns**: <code>number</code> - The current queue rate limit factor in milliseconds.  
<a name="module_dotaBot..DotaBot+rateLimit"></a>

#### dotaBot.rateLimit
Set the rate limiting factor

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  

| Param | Type | Description |
| --- | --- | --- |
| rateLimit | <code>number</code> | Milliseconds to wait between requests. |

<a name="module_dotaBot..DotaBot+backoff"></a>

#### dotaBot.backoff ⇒ <code>number</code>
Get the current backoff time of the queue

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
**Returns**: <code>number</code> - The current queue backoff time in milliseconds.  
<a name="module_dotaBot..DotaBot+backoff"></a>

#### dotaBot.backoff
Set the backoff time of the queue

**Kind**: instance property of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  

| Param | Type | Description |
| --- | --- | --- |
| backoff | <code>number</code> | Exponential backoff time in milliseconds. |

<a name="module_dotaBot..DotaBot+schedule"></a>

#### dotaBot.schedule()
Schedule a function for execution. This function will be executed as soon
as the GC is available.

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+block"></a>

#### dotaBot.block()
Block the queue

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+release"></a>

#### dotaBot.release()
Unblock the queue

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+clear"></a>

#### dotaBot.clear()
Clear the queue

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+onSteamClientLoggedOff"></a>

#### dotaBot.onSteamClientLoggedOff()
Steam client logged off handler.
Attempts to log on to steam and connect to Dota

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+onSteamClientError"></a>

#### dotaBot.onSteamClientError()
Steam client error handler.
Attempts to connect to steam and connect to Dota

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+onDotaReady"></a>

#### dotaBot.onDotaReady()
Dota ready handler.
Unblocks the queue.

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+onDotaUnready"></a>

#### dotaBot.onDotaUnready()
Dota unready handler.
Blocks the queue.

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+connect"></a>

#### dotaBot.connect()
Initiates the connection to Steam and the Dota2 Game Coordinator.

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+logOnToSteam"></a>

#### dotaBot.logOnToSteam()
Log on to steam. Set online state and display name.

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+connectToDota"></a>

#### dotaBot.connectToDota()
Connect to dota and unblock queue.

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+disconnect"></a>

#### dotaBot.disconnect()
Disconnect from the Game Coordinator. This will also cancel all queued
operations!

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  
<a name="module_dotaBot..DotaBot+inviteToLobby"></a>

#### dotaBot.inviteToLobby(steamId64)
Invites the given steam id to the Dota lobby.

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  

| Param | Type | Description |
| --- | --- | --- |
| steamId64 | <code>string</code> | A steam id. |

<a name="module_dotaBot..DotaBot+practiceLobbyKickFromTeam"></a>

#### dotaBot.practiceLobbyKickFromTeam(accountId)
Kick the given account id from the lobby team slots.

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  

| Param | Type | Description |
| --- | --- | --- |
| accountId | <code>number</code> | An account id. |

<a name="module_dotaBot..DotaBot+practiceLobbyKick"></a>

#### dotaBot.practiceLobbyKick(accountId)
Kick the given account id from the lobby.

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  

| Param | Type | Description |
| --- | --- | --- |
| accountId | <code>number</code> | An account id. |

<a name="module_dotaBot..DotaBot+joinPracticeLobby"></a>

#### dotaBot.joinPracticeLobby(dotaLobbyId)
Join the lobby by dota lobby id.

**Kind**: instance method of [<code>DotaBot</code>](#module_dotaBot..DotaBot)  

| Param | Type | Description |
| --- | --- | --- |
| dotaLobbyId | <code>string</code> | A dota lobby id. |

<a name="module_dotaBot..slotToTeam"></a>

### dotaBot~slotToTeam(slot) ⇒ <code>number</code>
Converts a Dota team slot value to a faction value.

**Kind**: inner method of [<code>dotaBot</code>](#module_dotaBot)  
**Returns**: <code>number</code> - An inhouse lobby faction.  

| Param | Type | Description |
| --- | --- | --- |
| slot | <code>number</code> | The Dota team slot. |

<a name="module_dotaBot..updatePlayerState"></a>

### dotaBot~updatePlayerState(steamId64, slot, playerState) ⇒ <code>Object</code>
Updates a player to team mapping object.
Used to track which players have joined team slots in lobby.
A null slot value will remove the player from the mapping meaning they are not in a team slot.

**Kind**: inner method of [<code>dotaBot</code>](#module_dotaBot)  
**Returns**: <code>Object</code> - A player to team mapping.  

| Param | Type | Description |
| --- | --- | --- |
| steamId64 | <code>string</code> | The player's steamid64. |
| slot | <code>number</code> | The lobby team slot the player joined. |
| playerState | <code>Object</code> | A player to team mapping. |

<a name="module_dotaBot..isDotaLobbyReady"></a>

### dotaBot~isDotaLobbyReady(teamCache, playerState) ⇒ <code>boolean</code>
Checks if all entries in a player to team mapping match the player to team state mapping.

**Kind**: inner method of [<code>dotaBot</code>](#module_dotaBot)  
**Returns**: <code>boolean</code> - Whether the player state matches the team cache.  

| Param | Type | Description |
| --- | --- | --- |
| teamCache | <code>Object</code> | The intended player to team state. |
| playerState | <code>Object</code> | The current state of players to teams. |

<a name="module_dotaBot..startDotaLobby"></a>

### dotaBot~startDotaLobby(dotaBot) ⇒ <code>string</code>
Start a dota lobby and return the match id.

**Kind**: inner method of [<code>dotaBot</code>](#module_dotaBot)  
**Returns**: <code>string</code> - The match id.  

| Param | Type | Description |
| --- | --- | --- |
| dotaBot | <code>module:dotaBot.DotaBot</code> | The dota bot. |

<a name="external_Long"></a>

### dotaBot~Long
A Long class for representing a 64 bit two's-complement integer value
derived from the Closure Library for stand-alone use and extended with unsigned support.

**Kind**: inner external of [<code>dotaBot</code>](#module_dotaBot)  
**Category**: Other  
**See**: [long](https://www.npmjs.com/package/long) npm package  
<a name="external_Dota2"></a>

### dotaBot~Dota2
External namespace for Dota2 classes.

**Kind**: inner external of [<code>dotaBot</code>](#module_dotaBot)  
**Category**: node-dota2  
**See**: https://github.com/Arcana/node-dota2  

* [~Dota2](#external_Dota2)
    * [.Dota2Client](#external_Dota2.Dota2Client)
        * [new Dota2Client()](#new_external_Dota2.Dota2Client_new)

<a name="external_Dota2.Dota2Client"></a>

#### Dota2.Dota2Client
**Kind**: static class of [<code>Dota2</code>](#external_Dota2)  
**Category**: node-dota2  
**See**: [https://github.com/Arcana/node-dota2#module_Dota2.Dota2Client](https://github.com/Arcana/node-dota2#module_Dota2.Dota2Client)  
<a name="new_external_Dota2.Dota2Client_new"></a>

##### new Dota2Client()
External Dota2 Dota2Client class.

<a name="external_steam"></a>

### dotaBot~steam
The Steam for Node JS package, allowing interaction with Steam.

**Kind**: inner external of [<code>dotaBot</code>](#module_dotaBot)  
**Category**: node-steam  
**See**: [steam](https://www.npmjs.com/package/steam) npm package  

* [~steam](#external_steam)
    * [.SteamClient](#external_steam.SteamClient)
        * [new SteamClient()](#new_external_steam.SteamClient_new)
    * [.SteamUser](#external_steam.SteamUser)
        * [new SteamUser()](#new_external_steam.SteamUser_new)
    * [.SteamFriends](#external_steam.SteamFriends)
        * [new SteamFriends()](#new_external_steam.SteamFriends_new)

<a name="external_steam.SteamClient"></a>

#### steam.SteamClient
**Kind**: static class of [<code>steam</code>](#external_steam)  
**Category**: node-steam  
**See**: [https://github.com/seishun/node-steam#steamclient](https://github.com/seishun/node-steam#steamclient)  
<a name="new_external_steam.SteamClient_new"></a>

##### new SteamClient()
External steam SteamClient class.

<a name="external_steam.SteamUser"></a>

#### steam.SteamUser
**Kind**: static class of [<code>steam</code>](#external_steam)  
**Category**: node-steam  
**See**: [https://github.com/seishun/node-steam/tree/master/lib/handlers/user](https://github.com/seishun/node-steam/tree/master/lib/handlers/user)  
<a name="new_external_steam.SteamUser_new"></a>

##### new SteamUser()
External steam SteamUser class.

<a name="external_steam.SteamFriends"></a>

#### steam.SteamFriends
**Kind**: static class of [<code>steam</code>](#external_steam)  
**Category**: node-steam  
**See**: [https://github.com/seishun/node-steam/tree/master/lib/handlers/friends](https://github.com/seishun/node-steam/tree/master/lib/handlers/friends)  
<a name="new_external_steam.SteamFriends_new"></a>

##### new SteamFriends()
External steam SteamFriends class.

<a name="module_guild"></a>

## guild

* [guild](#module_guild)
    * [~resolveUser()](#module_guild..resolveUser)
    * [~resolveRole()](#module_guild..resolveRole)
    * _discord.js_
        * [~discordjs](#external_discordjs)
            * [.Client](#external_discordjs.Client)
                * [new Client()](#new_external_discordjs.Client_new)
            * [.Guild](#external_discordjs.Guild)
                * [new Guild()](#new_external_discordjs.Guild_new)
            * [.CategoryChannel](#external_discordjs.CategoryChannel)
                * [new CategoryChannel()](#new_external_discordjs.CategoryChannel_new)
            * [.GuildChannel](#external_discordjs.GuildChannel)
                * [new GuildChannel()](#new_external_discordjs.GuildChannel_new)
            * [.Role](#external_discordjs.Role)
                * [new Role()](#new_external_discordjs.Role_new)
            * [.GuildMember](#external_discordjs.GuildMember)
                * [new GuildMember()](#new_external_discordjs.GuildMember_new)
            * [.User](#external_discordjs.User)
                * [new User()](#new_external_discordjs.User_new)
            * [.Message](#external_discordjs.Message)
                * [new Message()](#new_external_discordjs.Message_new)

<a name="module_guild..resolveUser"></a>

### guild~resolveUser()
**Kind**: inner method of [<code>guild</code>](#module_guild)  
**Throws**:

- <code>InvalidArgumentException</code> Argument userResolvable must be a Discord.js GuildMember, discord id string,
an object with a discordId string property, or an object with a steamId64 property.
- <code>DiscordUserNotFound</code> Will throw if a guild member is not found with the discord id.

<a name="module_guild..resolveRole"></a>

### guild~resolveRole()
**Kind**: inner method of [<code>guild</code>](#module_guild)  
**Throws**:

- <code>InvalidArgumentException</code> Argument userResolvable must be a role name string or a Discord.js Role object.
- <code>DiscordUserNotFound</code> Will throw if a role with the given name is not found.

<a name="external_discordjs"></a>

### guild~discordjs
External namespace for discord.js classes.

**Kind**: inner external of [<code>guild</code>](#module_guild)  
**Category**: discord.js  
**See**: [https://discord.js.org/#/docs/main/stable/general/welcome](https://discord.js.org/#/docs/main/stable/general/welcome)  

* [~discordjs](#external_discordjs)
    * [.Client](#external_discordjs.Client)
        * [new Client()](#new_external_discordjs.Client_new)
    * [.Guild](#external_discordjs.Guild)
        * [new Guild()](#new_external_discordjs.Guild_new)
    * [.CategoryChannel](#external_discordjs.CategoryChannel)
        * [new CategoryChannel()](#new_external_discordjs.CategoryChannel_new)
    * [.GuildChannel](#external_discordjs.GuildChannel)
        * [new GuildChannel()](#new_external_discordjs.GuildChannel_new)
    * [.Role](#external_discordjs.Role)
        * [new Role()](#new_external_discordjs.Role_new)
    * [.GuildMember](#external_discordjs.GuildMember)
        * [new GuildMember()](#new_external_discordjs.GuildMember_new)
    * [.User](#external_discordjs.User)
        * [new User()](#new_external_discordjs.User_new)
    * [.Message](#external_discordjs.Message)
        * [new Message()](#new_external_discordjs.Message_new)

<a name="external_discordjs.Client"></a>

#### discordjs.Client
**Kind**: static class of [<code>discordjs</code>](#external_discordjs)  
**Category**: discord.js  
**See**: [https://discord.js.org/#/docs/main/stable/class/Client](https://discord.js.org/#/docs/main/stable/class/Client)  
<a name="new_external_discordjs.Client_new"></a>

##### new Client()
External Discord.js Client class.

<a name="external_discordjs.Guild"></a>

#### discordjs.Guild
**Kind**: static class of [<code>discordjs</code>](#external_discordjs)  
**Category**: discord.js  
**See**: [https://discord.js.org/#/docs/main/stable/class/Guild](https://discord.js.org/#/docs/main/stable/class/Guild)  
<a name="new_external_discordjs.Guild_new"></a>

##### new Guild()
External Discord.js Guild class.

<a name="external_discordjs.CategoryChannel"></a>

#### discordjs.CategoryChannel
**Kind**: static class of [<code>discordjs</code>](#external_discordjs)  
**Category**: discord.js  
**See**: [https://discord.js.org/#/docs/main/stable/class/CategoryChannel](https://discord.js.org/#/docs/main/stable/class/CategoryChannel)  
<a name="new_external_discordjs.CategoryChannel_new"></a>

##### new CategoryChannel()
External Discord.js CategoryChannel class.

<a name="external_discordjs.GuildChannel"></a>

#### discordjs.GuildChannel
**Kind**: static class of [<code>discordjs</code>](#external_discordjs)  
**Category**: discord.js  
**See**: [https://discord.js.org/#/docs/main/stable/class/GuildChannel](https://discord.js.org/#/docs/main/stable/class/GuildChannel)  
<a name="new_external_discordjs.GuildChannel_new"></a>

##### new GuildChannel()
External Discord.js GuildChannel class.

<a name="external_discordjs.Role"></a>

#### discordjs.Role
**Kind**: static class of [<code>discordjs</code>](#external_discordjs)  
**Category**: discord.js  
**See**: [https://discord.js.org/#/docs/main/stable/class/Role](https://discord.js.org/#/docs/main/stable/class/Role)  
<a name="new_external_discordjs.Role_new"></a>

##### new Role()
External Discord.js Role class.

<a name="external_discordjs.GuildMember"></a>

#### discordjs.GuildMember
**Kind**: static class of [<code>discordjs</code>](#external_discordjs)  
**Category**: discord.js  
**See**: [https://discord.js.org/#/docs/main/stable/class/GuildMember](https://discord.js.org/#/docs/main/stable/class/GuildMember)  
<a name="new_external_discordjs.GuildMember_new"></a>

##### new GuildMember()
External Discord.js GuildMember class.

<a name="external_discordjs.User"></a>

#### discordjs.User
**Kind**: static class of [<code>discordjs</code>](#external_discordjs)  
**Category**: discord.js  
**See**: [https://discord.js.org/#/docs/main/stable/class/User](https://discord.js.org/#/docs/main/stable/class/User)  
<a name="new_external_discordjs.User_new"></a>

##### new User()
External Discord.js User class.

<a name="external_discordjs.Message"></a>

#### discordjs.Message
**Kind**: static class of [<code>discordjs</code>](#external_discordjs)  
**Category**: discord.js  
**See**: [https://discord.js.org/#/docs/main/stable/class/Message](https://discord.js.org/#/docs/main/stable/class/Message)  
<a name="new_external_discordjs.Message_new"></a>

##### new Message()
External Discord.js Message class.

<a name="module_ihl"></a>

## ihl

* [ihl](#module_ihl)
    * _static_
        * [.InhouseState](#module_ihl.InhouseState) : <code>Object</code>
        * [.LeagueGuildObject](#module_ihl.LeagueGuildObject) : <code>Object</code>
    * _inner_
        * [~getUserRankTier(steamId64)](#module_ihl..getUserRankTier) ⇒ <code>number</code>
        * [~registerUser(guildId, steamId64, discordId)](#module_ihl..registerUser) ⇒ <code>User</code>
        * [~createInhouseState()](#module_ihl..createInhouseState) ⇒ [<code>InhouseState</code>](#module_ihl.InhouseState)
        * [~hasActiveLobbies(user)](#module_ihl..hasActiveLobbies) ⇒ <code>boolean</code>
        * [~joinLobbyQueue(lobbyState, user)](#module_ihl..joinLobbyQueue)
        * [~getAllLobbyQueues(inhouseState, user)](#module_ihl..getAllLobbyQueues)
        * [~leaveLobbyQueue(lobbyState, user)](#module_ihl..leaveLobbyQueue)
        * [~getAllLobbyQueuesForUser(inhouseState, user)](#module_ihl..getAllLobbyQueuesForUser)
        * [~banInhouseQueue(user, timeout)](#module_ihl..banInhouseQueue)

<a name="module_ihl.InhouseState"></a>

### ihl.InhouseState : <code>Object</code>
**Kind**: static typedef of [<code>ihl</code>](#module_ihl)  
<a name="module_ihl.LeagueGuildObject"></a>

### ihl.LeagueGuildObject : <code>Object</code>
**Kind**: static typedef of [<code>ihl</code>](#module_ihl)  
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
<a name="module_ihl..hasActiveLobbies"></a>

### ihl~hasActiveLobbies(user) ⇒ <code>boolean</code>
Checks if a user has active lobbies.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  
**Returns**: <code>boolean</code> - Whether the user has active lobbies.  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>module:db.User</code> | The user to check. |

<a name="module_ihl..joinLobbyQueue"></a>

### ihl~joinLobbyQueue(lobbyState, user)
Adds a user to a lobby queue.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | A lobby state. |
| user | <code>module:db.User</code> | The player to queue. |

<a name="module_ihl..getAllLobbyQueues"></a>

### ihl~getAllLobbyQueues(inhouseState, user)
Add a user to all lobby queues.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  

| Param | Type | Description |
| --- | --- | --- |
| inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | An inhouse state. |
| user | <code>module:db.User</code> | The player to queue. |

<a name="module_ihl..leaveLobbyQueue"></a>

### ihl~leaveLobbyQueue(lobbyState, user)
Removes a user from a lobby queue.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | A lobby state. |
| user | <code>module:db.User</code> | The player to dequeue. |

<a name="module_ihl..getAllLobbyQueuesForUser"></a>

### ihl~getAllLobbyQueuesForUser(inhouseState, user)
Removes a user from all lobby queues.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  

| Param | Type | Description |
| --- | --- | --- |
| inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | An inhouse state. |
| user | <code>module:db.User</code> | The player to dequeue. |

<a name="module_ihl..banInhouseQueue"></a>

### ihl~banInhouseQueue(user, timeout)
Bans a user from an inhouse queue.

**Kind**: inner method of [<code>ihl</code>](#module_ihl)  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>module:db.User</code> | The player to ban. |
| timeout | <code>number</code> | The duration of ban in minutes. |

<a name="module_ihlCommand"></a>

## ihlCommand

* [ihlCommand](#module_ihlCommand)
    * _static_
        * _Commands_
            * [.BotListCommand](#module_ihlCommand.BotListCommand) ⇐ <code>IHLCommand</code>
            * [.LeagueInfoCommand](#module_ihlCommand.LeagueInfoCommand) ⇐ <code>IHLCommand</code>
            * [.LeagueSeasonCommand](#module_ihlCommand.LeagueSeasonCommand) ⇐ <code>IHLCommand</code>
            * [.LeagueTicketCommand](#module_ihlCommand.LeagueTicketCommand) ⇐ <code>IHLCommand</code>
            * [.LeagueUpdateCommand](#module_ihlCommand.LeagueUpdateCommand) ⇐ <code>IHLCommand</code>
            * [.LobbyDraftCommand](#module_ihlCommand.LobbyDraftCommand) ⇐ <code>IHLCommand</code>
            * [.LobbyFirstPickCommand](#module_ihlCommand.LobbyFirstPickCommand) ⇐ <code>IHLCommand</code>
            * [.LobbyGameModeCommand](#module_ihlCommand.LobbyGameModeCommand) ⇐ <code>IHLCommand</code>
            * [.LobbyInviteCommand](#module_ihlCommand.LobbyInviteCommand) ⇐ <code>IHLCommand</code>
            * [.LobbyKickCommand](#module_ihlCommand.LobbyKickCommand) ⇐ <code>IHLCommand</code>
            * [.LobbyKillCommand](#module_ihlCommand.LobbyKillCommand) ⇐ <code>IHLCommand</code>
            * [.LobbyRunCommand](#module_ihlCommand.LobbyRunCommand) ⇐ <code>IHLCommand</code>
            * [.LobbyStartCommand](#module_ihlCommand.LobbyStartCommand) ⇐ <code>IHLCommand</code>
            * [.LobbyStateCommand](#module_ihlCommand.LobbyStateCommand) ⇐ <code>IHLCommand</code>
            * [.LobbySwapCommand](#module_ihlCommand.LobbySwapCommand) ⇐ <code>IHLCommand</code>
            * [.QueueBanCommand](#module_ihlCommand.QueueBanCommand) ⇐ <code>IHLCommand</code>
            * [.QueueClearCommand](#module_ihlCommand.QueueClearCommand) ⇐ <code>IHLCommand</code>
            * [.UserBadgeCommand](#module_ihlCommand.UserBadgeCommand) ⇐ <code>IHLCommand</code>
            * [.UserVouchCommand](#module_ihlCommand.UserVouchCommand) ⇐ <code>IHLCommand</code>
            * [.UserVouchCommand](#module_ihlCommand.UserVouchCommand) ⇐ <code>IHLCommand</code>
            * [.ChallengeListCommand](#module_ihlCommand.ChallengeListCommand) ⇐ <code>IHLCommand</code>
            * [.ChallengeCommand](#module_ihlCommand.ChallengeCommand) ⇐ <code>IHLCommand</code>
            * [.UnchallengeCommand](#module_ihlCommand.UnchallengeCommand) ⇐ <code>IHLCommand</code>
            * [.CommendCommand](#module_ihlCommand.CommendCommand) ⇐ <code>IHLCommand</code>
            * [.DireCommand](#module_ihlCommand.DireCommand) ⇐ <code>IHLCommand</code>
            * [.FirstCommand](#module_ihlCommand.FirstCommand) ⇐ <code>IHLCommand</code>
            * [.GameModeCommand](#module_ihlCommand.GameModeCommand) ⇐ <code>IHLCommand</code>
            * [.InviteCommand](#module_ihlCommand.InviteCommand) ⇐ <code>IHLCommand</code>
            * [.LeaderboardCommand](#module_ihlCommand.LeaderboardCommand) ⇐ <code>IHLCommand</code>
            * [.NicknameCommand](#module_ihlCommand.NicknameCommand) ⇐ <code>IHLCommand</code>
            * [.PickCommand](#module_ihlCommand.PickCommand) ⇐ <code>IHLCommand</code>
            * [.RadiantCommand](#module_ihlCommand.RadiantCommand) ⇐ <code>IHLCommand</code>
            * [.RegisterCommand](#module_ihlCommand.RegisterCommand) ⇐ <code>IHLCommand</code>
            * [.RepCommand](#module_ihlCommand.RepCommand) ⇐ <code>IHLCommand</code>
            * [.RolesCommand](#module_ihlCommand.RolesCommand) ⇐ <code>IHLCommand</code>
            * [.SecondCommand](#module_ihlCommand.SecondCommand) ⇐ <code>IHLCommand</code>
            * [.UncommendCommand](#module_ihlCommand.UncommendCommand) ⇐ <code>IHLCommand</code>
            * [.UnrepCommand](#module_ihlCommand.UnrepCommand) ⇐ <code>IHLCommand</code>
            * [.WhoisCommand](#module_ihlCommand.WhoisCommand) ⇐ <code>IHLCommand</code>
            * [.BotAddCommand](#module_ihlCommand.BotAddCommand) ⇐ <code>IHLCommand</code>
            * [.BotRemoveCommand](#module_ihlCommand.BotRemoveCommand) ⇐ <code>IHLCommand</code>
            * [.BotStatusCommand](#module_ihlCommand.BotStatusCommand) ⇐ <code>IHLCommand</code>
            * [.InviteUrlCommand](#module_ihlCommand.InviteUrlCommand) ⇐ <code>IHLCommand</code>
            * [.LeagueCreateCommand](#module_ihlCommand.LeagueCreateCommand) ⇐ <code>IHLCommand</code>
            * [.LogLevelCommand](#module_ihlCommand.LogLevelCommand) ⇐ <code>IHLCommand</code>
            * [.RestartCommand](#module_ihlCommand.RestartCommand) ⇐ <code>IHLCommand</code>
            * [.TicketAddCommand](#module_ihlCommand.TicketAddCommand) ⇐ <code>IHLCommand</code>
            * [.TicketRemoveCommand](#module_ihlCommand.TicketRemoveCommand) ⇐ <code>IHLCommand</code>
            * [.QueueJoinCommand](#module_ihlCommand.QueueJoinCommand) ⇐ <code>IHLCommand</code>
            * [.QueueLeaveCommand](#module_ihlCommand.QueueLeaveCommand) ⇐ <code>IHLCommand</code>
            * [.QueueReadyCommand](#module_ihlCommand.QueueReadyCommand) ⇐ <code>IHLCommand</code>
            * [.QueueStatusCommand](#module_ihlCommand.QueueStatusCommand) ⇐ <code>IHLCommand</code>
    * _inner_
        * [~IHLCommand](#module_ihlCommand..IHLCommand) ⇐ <code>external:commando.Command</code>
        * _Other_
            * [~commando](#external_commando)

<a name="module_ihlCommand.BotListCommand"></a>

### ihlCommand.BotListCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LeagueInfoCommand"></a>

### ihlCommand.LeagueInfoCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LeagueSeasonCommand"></a>

### ihlCommand.LeagueSeasonCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LeagueTicketCommand"></a>

### ihlCommand.LeagueTicketCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LeagueUpdateCommand"></a>

### ihlCommand.LeagueUpdateCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LobbyDraftCommand"></a>

### ihlCommand.LobbyDraftCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LobbyFirstPickCommand"></a>

### ihlCommand.LobbyFirstPickCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LobbyGameModeCommand"></a>

### ihlCommand.LobbyGameModeCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LobbyInviteCommand"></a>

### ihlCommand.LobbyInviteCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LobbyKickCommand"></a>

### ihlCommand.LobbyKickCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LobbyKillCommand"></a>

### ihlCommand.LobbyKillCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LobbyRunCommand"></a>

### ihlCommand.LobbyRunCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LobbyStartCommand"></a>

### ihlCommand.LobbyStartCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LobbyStateCommand"></a>

### ihlCommand.LobbyStateCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LobbySwapCommand"></a>

### ihlCommand.LobbySwapCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.QueueBanCommand"></a>

### ihlCommand.QueueBanCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.QueueClearCommand"></a>

### ihlCommand.QueueClearCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.UserBadgeCommand"></a>

### ihlCommand.UserBadgeCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.UserVouchCommand"></a>

### ihlCommand.UserVouchCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.UserVouchCommand"></a>

### ihlCommand.UserVouchCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.ChallengeListCommand"></a>

### ihlCommand.ChallengeListCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.ChallengeCommand"></a>

### ihlCommand.ChallengeCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.UnchallengeCommand"></a>

### ihlCommand.UnchallengeCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.CommendCommand"></a>

### ihlCommand.CommendCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.DireCommand"></a>

### ihlCommand.DireCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.FirstCommand"></a>

### ihlCommand.FirstCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.GameModeCommand"></a>

### ihlCommand.GameModeCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.InviteCommand"></a>

### ihlCommand.InviteCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LeaderboardCommand"></a>

### ihlCommand.LeaderboardCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.NicknameCommand"></a>

### ihlCommand.NicknameCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.PickCommand"></a>

### ihlCommand.PickCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.RadiantCommand"></a>

### ihlCommand.RadiantCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.RegisterCommand"></a>

### ihlCommand.RegisterCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.RepCommand"></a>

### ihlCommand.RepCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.RolesCommand"></a>

### ihlCommand.RolesCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.SecondCommand"></a>

### ihlCommand.SecondCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.UncommendCommand"></a>

### ihlCommand.UncommendCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.UnrepCommand"></a>

### ihlCommand.UnrepCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.WhoisCommand"></a>

### ihlCommand.WhoisCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.BotAddCommand"></a>

### ihlCommand.BotAddCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.BotRemoveCommand"></a>

### ihlCommand.BotRemoveCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.BotStatusCommand"></a>

### ihlCommand.BotStatusCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.InviteUrlCommand"></a>

### ihlCommand.InviteUrlCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LeagueCreateCommand"></a>

### ihlCommand.LeagueCreateCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.LogLevelCommand"></a>

### ihlCommand.LogLevelCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.RestartCommand"></a>

### ihlCommand.RestartCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.TicketAddCommand"></a>

### ihlCommand.TicketAddCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.TicketRemoveCommand"></a>

### ihlCommand.TicketRemoveCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.QueueJoinCommand"></a>

### ihlCommand.QueueJoinCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.QueueLeaveCommand"></a>

### ihlCommand.QueueLeaveCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.QueueReadyCommand"></a>

### ihlCommand.QueueReadyCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand.QueueStatusCommand"></a>

### ihlCommand.QueueStatusCommand ⇐ <code>IHLCommand</code>
**Kind**: static class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>IHLCommand</code>  
**Category**: Commands  
<a name="module_ihlCommand..IHLCommand"></a>

### ihlCommand~IHLCommand ⇐ <code>external:commando.Command</code>
**Kind**: inner class of [<code>ihlCommand</code>](#module_ihlCommand)  
**Extends**: <code>external:commando.Command</code>  
<a name="external_commando"></a>

### ihlCommand~commando
External namespace for discord.js Commando classes.

**Kind**: inner external of [<code>ihlCommand</code>](#module_ihlCommand)  
**Category**: Other  
**See**: [https://github.com/discordjs/Commando/tree/djs-v11](https://github.com/discordjs/Commando/tree/djs-v11)  
<a name="module_ihlManager"></a>

## ihlManager

* [ihlManager](#module_ihlManager)
    * _static_
        * [.EventListeners](#module_ihlManager.EventListeners)
        * [.LobbyQueueHandlers](#module_ihlManager.LobbyQueueHandlers)
        * [.LobbyStateHandlers](#module_ihlManager.LobbyStateHandlers)
    * _inner_
        * [~IHLManager](#module_ihlManager..IHLManager)
            * [new IHLManager()](#new_module_ihlManager..IHLManager_new)
            * [.init(client)](#module_ihlManager..IHLManager+init)
            * [.onClientReady()](#module_ihlManager..IHLManager+onClientReady)
            * [.onDiscordMessage(msg)](#module_ihlManager..IHLManager+onDiscordMessage)
            * [.onDiscordMemberLeave(member)](#module_ihlManager..IHLManager+onDiscordMemberLeave)
            * [.createNewLeague(guild)](#module_ihlManager..IHLManager+createNewLeague)
            * [.createChallengeLobby(inhouseState, captain1, captain2, challenge)](#module_ihlManager..IHLManager+createChallengeLobby)
            * [.runLobbiesForInhouse(inhouseState)](#module_ihlManager..IHLManager+runLobbiesForInhouse)
            * [.joinLobbyQueue(lobbyState, user, discordUser)](#module_ihlManager..IHLManager+joinLobbyQueue)
            * [.joinAllLobbyQueues(inhouseState, user, discordUser)](#module_ihlManager..IHLManager+joinAllLobbyQueues)
            * [.leaveLobbyQueue(lobbyState, user, discordUser)](#module_ihlManager..IHLManager+leaveLobbyQueue)
            * [.leaveAllLobbyQueues(inhouseState, user, discordUser)](#module_ihlManager..IHLManager+leaveAllLobbyQueues)
            * [.clearLobbyQueue(lobbyState)](#module_ihlManager..IHLManager+clearLobbyQueue)
            * [.clearAllLobbyQueues(inhouseState)](#module_ihlManager..IHLManager+clearAllLobbyQueues)
            * [.banInhouseQueue(inhouseState, user, timeout, discordUser)](#module_ihlManager..IHLManager+banInhouseQueue)
            * [.registerLobbyTimeout(lobbyState)](#module_ihlManager..IHLManager+registerLobbyTimeout)
            * [.unregisterLobbyTimeout(lobbyState)](#module_ihlManager..IHLManager+unregisterLobbyTimeout)
            * [.runLobby(_lobbyState, states)](#module_ihlManager..IHLManager+runLobby)
            * [.onCreateLobbyQueue(_lobbyState)](#module_ihlManager..IHLManager+onCreateLobbyQueue)
            * [.onSetLobbyState(_lobbyState, state)](#module_ihlManager..IHLManager+onSetLobbyState)
            * [.onSetBotStatus(steamId64, status)](#module_ihlManager..IHLManager+onSetBotStatus)
            * [.onLeagueTicketAdd(league, leagueid, name)](#module_ihlManager..IHLManager+onLeagueTicketAdd)
            * [.onLeagueTicketSet(league, leagueid)](#module_ihlManager..IHLManager+onLeagueTicketSet) ⇒ <code>module:db.Ticket</code>
            * [.onLeagueTicketRemove(league, leagueid)](#module_ihlManager..IHLManager+onLeagueTicketRemove)
            * [.onBotAvailable()](#module_ihlManager..IHLManager+onBotAvailable)
            * [.onBotLobbyLeft()](#module_ihlManager..IHLManager+onBotLobbyLeft)
            * [.onLobbyTimedOut(lobbyState)](#module_ihlManager..IHLManager+onLobbyTimedOut)
            * [.onPlayerReady(lobbyState, user)](#module_ihlManager..IHLManager+onPlayerReady)
            * [.onSelectionPick(_lobbyState, captain, pick)](#module_ihlManager..IHLManager+onSelectionPick)
            * [.onSelectionSide(_lobbyState, captain, side)](#module_ihlManager..IHLManager+onSelectionSide)
            * [.onDraftMember(lobbyState, user, faction)](#module_ihlManager..IHLManager+onDraftMember)
            * [.onForceLobbyDraft(lobbyState, captain1, captain2)](#module_ihlManager..IHLManager+onForceLobbyDraft)
            * [.onStartDotaLobby(_lobbyState, _dotaBot)](#module_ihlManager..IHLManager+onStartDotaLobby) ⇒ <code>module:lobby.lobbyState</code>
            * [.onLobbyKick(lobbyState, user)](#module_ihlManager..IHLManager+onLobbyKick)
            * [.onLobbyInvite(lobbyState, user)](#module_ihlManager..IHLManager+onLobbyInvite)
            * [.onLobbyReady(dotaLobbyId)](#module_ihlManager..IHLManager+onLobbyReady)
            * [.onLobbyKill(lobbyState)](#module_ihlManager..IHLManager+onLobbyKill)
            * [.onMatchSignedOut(matchId)](#module_ihlManager..IHLManager+onMatchSignedOut)
            * [.onMatchOutcome(dotaLobbyId, matchOutcome, members)](#module_ihlManager..IHLManager+onMatchOutcome)
            * [.onMatchStats(lobby)](#module_ihlManager..IHLManager+onMatchStats)
            * [.onMatchNoStats(lobby)](#module_ihlManager..IHLManager+onMatchNoStats)
            * [.processEventQueue()](#module_ihlManager..IHLManager+processEventQueue)
            * [.queueEvent(fn, ...args)](#module_ihlManager..IHLManager+queueEvent)
            * [.getBot(botId)](#module_ihlManager..IHLManager+getBot) ⇒ <code>module:dotaBot.DotaBot</code>
            * [.loadBot(botId)](#module_ihlManager..IHLManager+loadBot) ⇒ <code>module:dotaBot.DotaBot</code>
            * [.removeBot(botId)](#module_ihlManager..IHLManager+removeBot)
            * [.botLeaveLobby(lobbyState)](#module_ihlManager..IHLManager+botLeaveLobby)
            * [.attachListeners()](#module_ihlManager..IHLManager+attachListeners)
        * [~findUser(guild, member)](#module_ihlManager..findUser) ⇒ <code>Array</code>
        * [~loadInhouseStates(guilds, leagues)](#module_ihlManager..loadInhouseStates) ⇒ [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState)
        * [~loadInhouseStatesFromLeagues(guilds)](#module_ihlManager..loadInhouseStatesFromLeagues) ⇒ [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState)
        * ["ready"](#module_ihlManager..event_ready)
        * ["empty"](#module_ihlManager..event_empty)
        * ["EVENT_MATCH_STATS" (lobby)](#module_ihlManager..event_EVENT_MATCH_STATS)
        * [~eventCallback](#module_ihlManager..eventCallback) : <code>function</code>
        * _Other_
            * [~EventEmitter](#external_EventEmitter)

<a name="module_ihlManager.EventListeners"></a>

### ihlManager.EventListeners
This provides methods used for ihlManager event handling.

**Kind**: static mixin of [<code>ihlManager</code>](#module_ihlManager)  
<a name="module_ihlManager.LobbyQueueHandlers"></a>

### ihlManager.LobbyQueueHandlers
This provides methods used for ihlManager lobby queue state handling.

**Kind**: static mixin of [<code>ihlManager</code>](#module_ihlManager)  
<a name="module_ihlManager.LobbyStateHandlers"></a>

### ihlManager.LobbyStateHandlers
This provides methods used for ihlManager lobby state handling.

**Kind**: static mixin of [<code>ihlManager</code>](#module_ihlManager)  
<a name="module_ihlManager..IHLManager"></a>

### ihlManager~IHLManager
Class representing the inhouse league manager.

**Kind**: inner class of [<code>ihlManager</code>](#module_ihlManager)  

* [~IHLManager](#module_ihlManager..IHLManager)
    * [new IHLManager()](#new_module_ihlManager..IHLManager_new)
    * [.init(client)](#module_ihlManager..IHLManager+init)
    * [.onClientReady()](#module_ihlManager..IHLManager+onClientReady)
    * [.onDiscordMessage(msg)](#module_ihlManager..IHLManager+onDiscordMessage)
    * [.onDiscordMemberLeave(member)](#module_ihlManager..IHLManager+onDiscordMemberLeave)
    * [.createNewLeague(guild)](#module_ihlManager..IHLManager+createNewLeague)
    * [.createChallengeLobby(inhouseState, captain1, captain2, challenge)](#module_ihlManager..IHLManager+createChallengeLobby)
    * [.runLobbiesForInhouse(inhouseState)](#module_ihlManager..IHLManager+runLobbiesForInhouse)
    * [.joinLobbyQueue(lobbyState, user, discordUser)](#module_ihlManager..IHLManager+joinLobbyQueue)
    * [.joinAllLobbyQueues(inhouseState, user, discordUser)](#module_ihlManager..IHLManager+joinAllLobbyQueues)
    * [.leaveLobbyQueue(lobbyState, user, discordUser)](#module_ihlManager..IHLManager+leaveLobbyQueue)
    * [.leaveAllLobbyQueues(inhouseState, user, discordUser)](#module_ihlManager..IHLManager+leaveAllLobbyQueues)
    * [.clearLobbyQueue(lobbyState)](#module_ihlManager..IHLManager+clearLobbyQueue)
    * [.clearAllLobbyQueues(inhouseState)](#module_ihlManager..IHLManager+clearAllLobbyQueues)
    * [.banInhouseQueue(inhouseState, user, timeout, discordUser)](#module_ihlManager..IHLManager+banInhouseQueue)
    * [.registerLobbyTimeout(lobbyState)](#module_ihlManager..IHLManager+registerLobbyTimeout)
    * [.unregisterLobbyTimeout(lobbyState)](#module_ihlManager..IHLManager+unregisterLobbyTimeout)
    * [.runLobby(_lobbyState, states)](#module_ihlManager..IHLManager+runLobby)
    * [.onCreateLobbyQueue(_lobbyState)](#module_ihlManager..IHLManager+onCreateLobbyQueue)
    * [.onSetLobbyState(_lobbyState, state)](#module_ihlManager..IHLManager+onSetLobbyState)
    * [.onSetBotStatus(steamId64, status)](#module_ihlManager..IHLManager+onSetBotStatus)
    * [.onLeagueTicketAdd(league, leagueid, name)](#module_ihlManager..IHLManager+onLeagueTicketAdd)
    * [.onLeagueTicketSet(league, leagueid)](#module_ihlManager..IHLManager+onLeagueTicketSet) ⇒ <code>module:db.Ticket</code>
    * [.onLeagueTicketRemove(league, leagueid)](#module_ihlManager..IHLManager+onLeagueTicketRemove)
    * [.onBotAvailable()](#module_ihlManager..IHLManager+onBotAvailable)
    * [.onBotLobbyLeft()](#module_ihlManager..IHLManager+onBotLobbyLeft)
    * [.onLobbyTimedOut(lobbyState)](#module_ihlManager..IHLManager+onLobbyTimedOut)
    * [.onPlayerReady(lobbyState, user)](#module_ihlManager..IHLManager+onPlayerReady)
    * [.onSelectionPick(_lobbyState, captain, pick)](#module_ihlManager..IHLManager+onSelectionPick)
    * [.onSelectionSide(_lobbyState, captain, side)](#module_ihlManager..IHLManager+onSelectionSide)
    * [.onDraftMember(lobbyState, user, faction)](#module_ihlManager..IHLManager+onDraftMember)
    * [.onForceLobbyDraft(lobbyState, captain1, captain2)](#module_ihlManager..IHLManager+onForceLobbyDraft)
    * [.onStartDotaLobby(_lobbyState, _dotaBot)](#module_ihlManager..IHLManager+onStartDotaLobby) ⇒ <code>module:lobby.lobbyState</code>
    * [.onLobbyKick(lobbyState, user)](#module_ihlManager..IHLManager+onLobbyKick)
    * [.onLobbyInvite(lobbyState, user)](#module_ihlManager..IHLManager+onLobbyInvite)
    * [.onLobbyReady(dotaLobbyId)](#module_ihlManager..IHLManager+onLobbyReady)
    * [.onLobbyKill(lobbyState)](#module_ihlManager..IHLManager+onLobbyKill)
    * [.onMatchSignedOut(matchId)](#module_ihlManager..IHLManager+onMatchSignedOut)
    * [.onMatchOutcome(dotaLobbyId, matchOutcome, members)](#module_ihlManager..IHLManager+onMatchOutcome)
    * [.onMatchStats(lobby)](#module_ihlManager..IHLManager+onMatchStats)
    * [.onMatchNoStats(lobby)](#module_ihlManager..IHLManager+onMatchNoStats)
    * [.processEventQueue()](#module_ihlManager..IHLManager+processEventQueue)
    * [.queueEvent(fn, ...args)](#module_ihlManager..IHLManager+queueEvent)
    * [.getBot(botId)](#module_ihlManager..IHLManager+getBot) ⇒ <code>module:dotaBot.DotaBot</code>
    * [.loadBot(botId)](#module_ihlManager..IHLManager+loadBot) ⇒ <code>module:dotaBot.DotaBot</code>
    * [.removeBot(botId)](#module_ihlManager..IHLManager+removeBot)
    * [.botLeaveLobby(lobbyState)](#module_ihlManager..IHLManager+botLeaveLobby)
    * [.attachListeners()](#module_ihlManager..IHLManager+attachListeners)

<a name="new_module_ihlManager..IHLManager_new"></a>

#### new IHLManager()
Creates an inhouse league manager.

<a name="module_ihlManager..IHLManager+init"></a>

#### ihlManager.init(client)
Initializes the inhouse league manager with a discord client and loads inhouse states for each league.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>external:Client</code> | A discord.js client. |

<a name="module_ihlManager..IHLManager+onClientReady"></a>

#### ihlManager.onClientReady()
Discord client ready handler.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  
**Emits**: [<code>ready</code>](#module_ihlManager..event_ready)  
<a name="module_ihlManager..IHLManager+onDiscordMessage"></a>

#### ihlManager.onDiscordMessage(msg)
Discord message handler.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| msg | [<code>Message</code>](#external_discordjs.Message) | The discord message. |

<a name="module_ihlManager..IHLManager+onDiscordMemberLeave"></a>

#### ihlManager.onDiscordMemberLeave(member)
Discord user left guild handler.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| member | [<code>GuildMember</code>](#external_discordjs.GuildMember) | The member that left. |

<a name="module_ihlManager..IHLManager+createNewLeague"></a>

#### ihlManager.createNewLeague(guild)
Creates a new inhouse in a discord guild.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| guild | [<code>Guild</code>](#external_discordjs.Guild) | The discord guild for the inhouse. |

<a name="module_ihlManager..IHLManager+createChallengeLobby"></a>

#### ihlManager.createChallengeLobby(inhouseState, captain1, captain2, challenge)
Creates and runs a challenge lobby.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| inhouseState | <code>module:ihl.inhouseState</code> | The inhouse state. |
| captain1 | <code>module:db.User</code> | The first lobby captain. |
| captain2 | <code>module:db.User</code> | The second lobby captain. |
| challenge | <code>module:db.Challenge</code> | The challenge between the two captains. |

<a name="module_ihlManager..IHLManager+runLobbiesForInhouse"></a>

#### ihlManager.runLobbiesForInhouse(inhouseState)
Runs all lobbies for an inhouse.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| inhouseState | <code>module:ihl.inhouseState</code> | The inhouse state. |

<a name="module_ihlManager..IHLManager+joinLobbyQueue"></a>

#### ihlManager.joinLobbyQueue(lobbyState, user, discordUser)
Adds a user to a lobby queue.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | The lobby to join. |
| user | <code>module:db.User</code> | The user to queue. |
| discordUser | [<code>User</code>](#external_discordjs.User) | A discord.js user. |

<a name="module_ihlManager..IHLManager+joinAllLobbyQueues"></a>

#### ihlManager.joinAllLobbyQueues(inhouseState, user, discordUser)
Adds a user to all lobby queues.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | The inhouse to queue. |
| user | <code>module:db.User</code> | The user to queue. |
| discordUser | [<code>User</code>](#external_discordjs.User) | A discord.js user. |

<a name="module_ihlManager..IHLManager+leaveLobbyQueue"></a>

#### ihlManager.leaveLobbyQueue(lobbyState, user, discordUser)
Removes a user from a lobby queue.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | The lobby to join. |
| user | <code>module:db.User</code> | The user to dequeue. |
| discordUser | [<code>User</code>](#external_discordjs.User) | A discord.js user. |

<a name="module_ihlManager..IHLManager+leaveAllLobbyQueues"></a>

#### ihlManager.leaveAllLobbyQueues(inhouseState, user, discordUser)
Removes a user from all lobby queues.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | The inhouse to dequeue. |
| user | <code>module:db.User</code> | The user to dequeue. |
| discordUser | [<code>User</code>](#external_discordjs.User) | A discord.js user. |

<a name="module_ihlManager..IHLManager+clearLobbyQueue"></a>

#### ihlManager.clearLobbyQueue(lobbyState)
Clear a lobby queue.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | The lobby queue to clear. |

<a name="module_ihlManager..IHLManager+clearAllLobbyQueues"></a>

#### ihlManager.clearAllLobbyQueues(inhouseState)
Clear all lobby queues.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | The inhouse queue to clear. |

<a name="module_ihlManager..IHLManager+banInhouseQueue"></a>

#### ihlManager.banInhouseQueue(inhouseState, user, timeout, discordUser)
Bans a user from the inhouse queue.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| inhouseState | [<code>InhouseState</code>](#module_ihl.InhouseState) | The inhouse to dequeue. |
| user | <code>module:db.User</code> | The player to ban. |
| timeout | <code>number</code> | Duration of ban in minutes. |
| discordUser | [<code>User</code>](#external_discordjs.User) | A discord.js user. |

<a name="module_ihlManager..IHLManager+registerLobbyTimeout"></a>

#### ihlManager.registerLobbyTimeout(lobbyState)
Creates and registers a ready up timer for a lobby state.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |

<a name="module_ihlManager..IHLManager+unregisterLobbyTimeout"></a>

#### ihlManager.unregisterLobbyTimeout(lobbyState)
Clears and unregisters the ready up timer for a lobby state.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |

<a name="module_ihlManager..IHLManager+runLobby"></a>

#### ihlManager.runLobby(_lobbyState, states)
Processes and executes a lobby state if it matches any of the given states.
If no states to match against are given, the lobby state is run by default.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |
| states | <code>Array.&lt;string&gt;</code> | A list of valid lobby states. |

<a name="module_ihlManager..IHLManager+onCreateLobbyQueue"></a>

#### ihlManager.onCreateLobbyQueue(_lobbyState)
Creates a queue lobby.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | The lobby state to create the queue from. |

<a name="module_ihlManager..IHLManager+onSetLobbyState"></a>

#### ihlManager.onSetLobbyState(_lobbyState, state)
Sets a lobby state.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | The lobby state being changed. |
| state | <code>string</code> | The state to set the lobby to. |

<a name="module_ihlManager..IHLManager+onSetBotStatus"></a>

#### ihlManager.onSetBotStatus(steamId64, status)
Sets a bot status.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| steamId64 | <code>string</code> | Bot steam id. |
| status | <code>string</code> | Bot status. |

<a name="module_ihlManager..IHLManager+onLeagueTicketAdd"></a>

#### ihlManager.onLeagueTicketAdd(league, leagueid, name)
Associates a league with a ticket.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| league | <code>module:db.League</code> | The league to add the ticket to. |
| leagueid | <code>number</code> | The ticket league id. |
| name | <code>string</code> | The ticket name. |

<a name="module_ihlManager..IHLManager+onLeagueTicketSet"></a>

#### ihlManager.onLeagueTicketSet(league, leagueid) ⇒ <code>module:db.Ticket</code>
Sets the league ticket.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| league | <code>module:db.League</code> | The league to set the ticket to. |
| leagueid | <code>number</code> | The ticket league id. |

<a name="module_ihlManager..IHLManager+onLeagueTicketRemove"></a>

#### ihlManager.onLeagueTicketRemove(league, leagueid)
Removes a ticket from a league.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| league | <code>module:db.League</code> | The league to remove the ticket from. |
| leagueid | <code>number</code> | The ticket league id. |

<a name="module_ihlManager..IHLManager+onBotAvailable"></a>

#### ihlManager.onBotAvailable()
Runs lobbies waiting for bots.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  
<a name="module_ihlManager..IHLManager+onBotLobbyLeft"></a>

#### ihlManager.onBotLobbyLeft()
Set bot idle then call onBotAvailable to run lobbies waiting for bots.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  
<a name="module_ihlManager..IHLManager+onLobbyTimedOut"></a>

#### ihlManager.onLobbyTimedOut(lobbyState)
Runs a lobby state when its ready up timer has expired.
Checks for STATE_CHECKING_READY lobby state

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |

<a name="module_ihlManager..IHLManager+onPlayerReady"></a>

#### ihlManager.onPlayerReady(lobbyState, user)
Runs a lobby state when a player has readied up and update their player ready state.
Checks for STATE_CHECKING_READY lobby state

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |
| user | <code>module:db.User</code> | An inhouse user. |

<a name="module_ihlManager..IHLManager+onSelectionPick"></a>

#### ihlManager.onSelectionPick(_lobbyState, captain, pick)
Updates a lobby state with a captain pick selection

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |
| captain | <code>module:db.User</code> | The captain user |
| pick | <code>number</code> | The selected pick |

<a name="module_ihlManager..IHLManager+onSelectionSide"></a>

#### ihlManager.onSelectionSide(_lobbyState, captain, side)
Updates a lobby state with a captain side selection

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |
| captain | <code>module:db.User</code> | The captain user |
| side | <code>number</code> | The selected faction |

<a name="module_ihlManager..IHLManager+onDraftMember"></a>

#### ihlManager.onDraftMember(lobbyState, user, faction)
Checks if a player is draftable and fires an event representing the result.
If the player is draftable, checks for STATE_DRAFTING_PLAYERS lobby state and runs the lobby state.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |
| user | <code>module:db.User</code> | The picked user |
| faction | <code>number</code> | The picking faction |

<a name="module_ihlManager..IHLManager+onForceLobbyDraft"></a>

#### ihlManager.onForceLobbyDraft(lobbyState, captain1, captain2)
Force lobby into player draft with assigned captains.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |
| captain1 | <code>module:db.User</code> | The captain 1 user |
| captain2 | <code>module:db.User</code> | The captain 2 user |

<a name="module_ihlManager..IHLManager+onStartDotaLobby"></a>

#### ihlManager.onStartDotaLobby(_lobbyState, _dotaBot) ⇒ <code>module:lobby.lobbyState</code>
Start a dota lobby if all players are in the lobby and on the correct teams.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| _lobbyState | <code>module:lobby.lobbyState</code> | The lobby state to check. |
| _dotaBot | <code>module:lobby.lobbyState</code> | The bot to check. |

<a name="module_ihlManager..IHLManager+onLobbyKick"></a>

#### ihlManager.onLobbyKick(lobbyState, user)
Kicks a player from the dota lobby.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |
| user | <code>module:db.User</code> | The player to kick |

<a name="module_ihlManager..IHLManager+onLobbyInvite"></a>

#### ihlManager.onLobbyInvite(lobbyState, user)
Invites a player to the dota lobby.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |
| user | <code>module:db.User</code> | The player to invite |

<a name="module_ihlManager..IHLManager+onLobbyReady"></a>

#### ihlManager.onLobbyReady(dotaLobbyId)
Runs a lobby state when the lobby is ready (all players have joined and are in the right team slot).
Checks for STATE_WAITING_FOR_PLAYERS lobby state

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| dotaLobbyId | <code>string</code> | A dota lobby id. |

<a name="module_ihlManager..IHLManager+onLobbyKill"></a>

#### ihlManager.onLobbyKill(lobbyState)
Puts a lobby state in STATE_PENDING_KILL and runs lobby.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | [<code>LobbyState</code>](#module_lobby.LobbyState) | An inhouse lobby state. |

<a name="module_ihlManager..IHLManager+onMatchSignedOut"></a>

#### ihlManager.onMatchSignedOut(matchId)
Handles match signed out bot event.
Updates STATE_MATCH_IN_PROGRESS lobby state to STATE_MATCH_ENDED

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| matchId | <code>number</code> | A dota match id. |

<a name="module_ihlManager..IHLManager+onMatchOutcome"></a>

#### ihlManager.onMatchOutcome(dotaLobbyId, matchOutcome, members)
Handles match outcome bot event.
Updates lobby winner and player stats.
Sends match stats message.
Puts lobby into STATE_MATCH_STATS state

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| dotaLobbyId | <code>string</code> | A dota lobby id. |
| matchOutcome | <code>external:Dota2.schema.EMatchOutcome</code> | The dota match outcome |
| members | <code>Array.&lt;external:Dota2.schema.CDOTALobbyMember&gt;</code> | Array of dota lobby members |

<a name="module_ihlManager..IHLManager+onMatchStats"></a>

#### ihlManager.onMatchStats(lobby)
Handles match tracker match stats event.
Sends match stats message.
Puts lobby into STATE_MATCH_STATS state

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobby | <code>module:db.Lobby</code> | A lobby database model |

<a name="module_ihlManager..IHLManager+onMatchNoStats"></a>

#### ihlManager.onMatchNoStats(lobby)
Handles match tracker match no stats event.
Sends match no stats message.
Puts lobby into STATE_MATCH_NO_STATS state

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobby | <code>module:db.Lobby</code> | A lobby database model |

<a name="module_ihlManager..IHLManager+processEventQueue"></a>

#### ihlManager.processEventQueue()
Processes the inhouse manager event queue until it is empty.
Events are actions to perform (mostly on lobby states or something that resolves to a lobby state).
An event consists of a function, the arguments to call it with,
and the resolve and reject callbacks of the Promise wrapping the action.
When the action is executed, resolve with the returned value
or reject if an error was thrown.
The queue blocks while processing an action, so only 1 can be processed at a time.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  
**Emits**: [<code>empty</code>](#module_ihlManager..event_empty)  
<a name="module_ihlManager..IHLManager+queueEvent"></a>

#### ihlManager.queueEvent(fn, ...args)
Adds a lobby processing function and its arguments to the queue.
When the queue is processed the function will be executed with its arguments.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| fn | <code>eventCallback</code> | A lobby processing event function. |
| ...args | <code>\*</code> | A list of arguments the lobby processing event function will be called with. |

<a name="module_ihlManager..IHLManager+getBot"></a>

#### ihlManager.getBot(botId) ⇒ <code>module:dotaBot.DotaBot</code>
Gets a bot.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| botId | <code>number</code> | The bot id. |

<a name="module_ihlManager..IHLManager+loadBot"></a>

#### ihlManager.loadBot(botId) ⇒ <code>module:dotaBot.DotaBot</code>
Start a dota bot.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| botId | <code>number</code> | The bot id. |

<a name="module_ihlManager..IHLManager+removeBot"></a>

#### ihlManager.removeBot(botId)
Remove a dota bot.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| botId | <code>number</code> | The bot id. |

<a name="module_ihlManager..IHLManager+botLeaveLobby"></a>

#### ihlManager.botLeaveLobby(lobbyState)
Disconnect a dota bot from its lobby.
The bot should eventually emit EVENT_BOT_LOBBY_LEFT.

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobbyState | <code>module:lobby.lobbyState</code> | The lobby for the bot. |

<a name="module_ihlManager..IHLManager+attachListeners"></a>

#### ihlManager.attachListeners()
Bind all events to their corresponding event handler functions

**Kind**: instance method of [<code>IHLManager</code>](#module_ihlManager..IHLManager)  
<a name="module_ihlManager..findUser"></a>

### ihlManager~findUser(guild, member) ⇒ <code>Array</code>
Searches the discord guild for a member.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: <code>Array</code> - The search result in an array containing the user record, discord guild member, and type of match.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>external:Guild</code> | A list of guilds to initialize leagues with. |
| member | <code>string</code> \| <code>external:GuildMember</code> | A name or search string for an inhouse player or their guild member instance. |

<a name="module_ihlManager..loadInhouseStates"></a>

### ihlManager~loadInhouseStates(guilds, leagues) ⇒ [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState)
Maps league records to inhouse states.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState) - The inhouse states loaded from league records.  

| Param | Type | Description |
| --- | --- | --- |
| guilds | <code>Array.&lt;external:Guild&gt;</code> | A list of guilds to initialize leagues with. |
| leagues | <code>Array.&lt;module:db.League&gt;</code> | A list of database league records. |

<a name="module_ihlManager..loadInhouseStatesFromLeagues"></a>

### ihlManager~loadInhouseStatesFromLeagues(guilds) ⇒ [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState)
Gets all league records from the database turns them into inhouse states.

**Kind**: inner method of [<code>ihlManager</code>](#module_ihlManager)  
**Returns**: [<code>Array.&lt;InhouseState&gt;</code>](#module_ihl.InhouseState) - The inhouse states loaded from all league records.  

| Param | Type | Description |
| --- | --- | --- |
| guilds | <code>Array.&lt;external:Guild&gt;</code> | A list of guilds to initialize leagues with. |

<a name="module_ihlManager..event_ready"></a>

### "ready"
IHLManager ready event.

**Kind**: event emitted by [<code>ihlManager</code>](#module_ihlManager)  
<a name="module_ihlManager..event_empty"></a>

### "empty"
IHLManager event queue empty event.

**Kind**: event emitted by [<code>ihlManager</code>](#module_ihlManager)  
<a name="module_ihlManager..event_EVENT_MATCH_STATS"></a>

### "EVENT_MATCH_STATS" (lobby)
Event for returning stats from a lobby.

**Kind**: event emitted by [<code>ihlManager</code>](#module_ihlManager)  

| Param | Type | Description |
| --- | --- | --- |
| lobby | <code>module:db.Lobby</code> | The lobby with stats. |

<a name="module_ihlManager..eventCallback"></a>

### ihlManager~eventCallback : <code>function</code>
Callback for a lobby processing event.

**Kind**: inner typedef of [<code>ihlManager</code>](#module_ihlManager)  
<a name="external_EventEmitter"></a>

### ihlManager~EventEmitter
Node.js EventEmitter object

**Kind**: inner external of [<code>ihlManager</code>](#module_ihlManager)  
**Category**: Other  
**See**: [https://nodejs.org/api/events.html#events_class_eventemitter](https://nodejs.org/api/events.html#events_class_eventemitter)  
<a name="module_lobby"></a>

## lobby
<a name="module_lobby.LobbyState"></a>

### lobby.LobbyState : <code>Object</code>
**Kind**: static typedef of [<code>lobby</code>](#module_lobby)  
<a name="module_matchTracker"></a>

## matchTracker

* [matchTracker](#module_matchTracker)
    * [~MatchTracker](#module_matchTracker..MatchTracker)
        * [new MatchTracker()](#new_module_matchTracker..MatchTracker_new)
        * [.run()](#module_matchTracker..MatchTracker+run)
        * [.enable()](#module_matchTracker..MatchTracker+enable)
        * [.disable()](#module_matchTracker..MatchTracker+disable)

<a name="module_matchTracker..MatchTracker"></a>

### matchTracker~MatchTracker
Match tracker checks opendota and valve match apis to see if a match has finished
and saves the match data to the database.

**Kind**: inner class of [<code>matchTracker</code>](#module_matchTracker)  

* [~MatchTracker](#module_matchTracker..MatchTracker)
    * [new MatchTracker()](#new_module_matchTracker..MatchTracker_new)
    * [.run()](#module_matchTracker..MatchTracker+run)
    * [.enable()](#module_matchTracker..MatchTracker+enable)
    * [.disable()](#module_matchTracker..MatchTracker+disable)

<a name="new_module_matchTracker..MatchTracker_new"></a>

#### new MatchTracker()
Creates an inhouse league match tracker.

<a name="module_matchTracker..MatchTracker+run"></a>

#### matchTracker.run()
The match polling loop

**Kind**: instance method of [<code>MatchTracker</code>](#module_matchTracker..MatchTracker)  
**Emits**: [<code>EVENT\_MATCH\_STATS</code>](#module_ihlManager..event_EVENT_MATCH_STATS)  
<a name="module_matchTracker..MatchTracker+enable"></a>

#### matchTracker.enable()
Enables the match polling loop

**Kind**: instance method of [<code>MatchTracker</code>](#module_matchTracker..MatchTracker)  
<a name="module_matchTracker..MatchTracker+disable"></a>

#### matchTracker.disable()
Disables the match polling loop

**Kind**: instance method of [<code>MatchTracker</code>](#module_matchTracker..MatchTracker)  
