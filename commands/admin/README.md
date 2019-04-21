
|Table of Contents| | | | | |
|--|--|--|--|--|--|
|[bot-list](#bot-list)|[league-info](#league-info)|[league-season](#league-season)|[league-ticket](#league-ticket)|[league-update](#league-update)|[lobby-draft](#lobby-draft)|
|[lobby-fp](#lobby-fp)|[lobby-gamemode](#lobby-gamemode)|[lobby-invite](#lobby-invite)|[lobby-kick](#lobby-kick)|[lobby-kill](#lobby-kill)|[lobby-run](#lobby-run)|
|[lobby-start](#lobby-start)|[lobby-state](#lobby-state)|[lobby-swap](#lobby-swap)|[queue-ban](#queue-ban)|[queue-clear](#queue-clear)|[user-badge](#user-badge)|
|[user-vouch](#user-vouch)|



## bot-list

**Format:** `!bot-list`

> List bots in the inhouse league.

**Guild only**

**Aliases:** `list-bot`, `list-bots`, `bots-list`, `botlist`, `listbot`, `listbots`, `botslist`

 
## league-info

**Format:** `!league-info`

> Display inhouse league info.

**Guild only**

**Aliases:** `leagueinfo`

 
## league-season

**Format:** `!league-season <name>`

> Start a new inhouse league season.

**Guild only**

**Aliases:** `leagueseason`

**Usage Examples:**
* `!league-season 2`
 
 
## league-ticket

**Format:** `!league-ticket <leagueid>`

> Set the current dota ticket for the league.

**Guild only**

**Aliases:** `set-ticket`, `ticket-set`, `leagueticket`, `setticket`, `ticketset`

**Usage Examples:**
* `!league-ticket 1063`
 
 
## league-update

**Format:** `!league-update <setting> <value>`

> Update an inhouse league setting.

**Guild only**

**Aliases:** `leagueupdate`

 
## lobby-draft

**Format:** `!lobby-draft <captain_1> <captain_2>`

> Force a lobby to do a player draft with assigned captains.

**Guild only**

**Aliases:** `lobbydraft`

**Usage Examples:**
* `!lobby-draft @devilesk @Ari-`
 
 
## lobby-fp

**Format:** `!lobby-fp <side>`

> Set lobby first pick.

**Guild only**

**Aliases:** `lobbyfp`

**Usage Examples:**
* `!lobby-fp radiant`
* `!lobby-fp dire`
 
 
## lobby-gamemode

**Format:** `!lobby-gamemode <mode>`

> Set lobby game mode.

**Guild only**

**Aliases:** `lobbygamemode`

**Usage Examples:**
* `!lobby-gamemode cm`
* `!lobby-gamemode cd`
* `!lobby-gamemode ap`
 
 
## lobby-invite

**Format:** `!lobby-invite <member>`

> Invite a user to a lobby.

**Guild only**

**Aliases:** `lobbyinvite`

**Usage Examples:**
* `!lobby-invite @devilesk`
 
 
## lobby-kick

**Format:** `!lobby-kick <member>`

> Kick a user from a lobby.

**Guild only**

**Aliases:** `lobbykick`

**Usage Examples:**
* `!lobby-kick @devilesk`
 
 
## lobby-kill

**Format:** `!lobby-kill`

> Kill a lobby.

**Guild only**

**Aliases:** `lobby-destroy`, `lobbykill`, `lobbydestroy`

 
## lobby-run

**Format:** `!lobby-run`

> Manually run a lobby.

**Guild only**

**Aliases:** `lobby-process`, `run-lobby`, `process-lobby`, `lobbyrun`, `lobbyprocess`, `runlobby`, `processlobby`

 
## lobby-start

**Format:** `!lobby-start`

> Start a lobby.

**Guild only**

**Aliases:** `start-lobby`, `lobbystart`, `startlobby`

 
## lobby-state

**Format:** `!lobby-state <state>`

> Manually set a lobby state and run it.

**Guild only**

**Aliases:** `lobbystate`

**Usage Examples:**
* `!lobby-state STATE_WAITING_FOR_QUEUE`
* `!lobby-state STATE_FAILED`
* `!lobby-state STATE_COMPLETED`
 
 
## lobby-swap

**Format:** `!lobby-swap`

> Swap lobby teams.

**Guild only**

**Aliases:** `lobby-flip`, `flip`, `swap`, `lobbyswap`, `lobbyflip`

 
## queue-ban

**Format:** `!queue-ban <member> [<timeout>]`

> Kick player from inhouse queue and tempban them.

**Guild only**

**Aliases:** `qban`, `ban`, `queueban`

**Usage Examples:**
* `!queue-ban @Ari* 5`
* `!queueban @Ari* 5`
* `!qban @Ari* 5`
* `!ban @Ari* 5`
 
 
## queue-clear

**Format:** `!queue-clear [<channel>]`

> Clear inhouse queue.

**Guild only**

**Aliases:** `qclear`, `clear`, `queueclear`

**Usage Examples:**
* `!queue-clear`
* `!queueclear`
* `!qclear`
* `!clear`
 
 
## user-badge

**Format:** `!user-badge <member> <rank_tier>`

> Set a user's badge rank.

**Guild only**

**Aliases:** `badge`, `userbadge`

**Usage Examples:**
* `!badge @Ari* 5`
 
 
## user-vouch

**Format:** `!user-vouch <member>`

> Vouch a user.

**Guild only**

**Aliases:** `vouch`, `uservouch`

**Usage Examples:**
* `!vouch @Ari* 5`
 
 