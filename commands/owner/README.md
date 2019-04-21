
|Table of Contents| | | | | |
|--|--|--|--|--|--|
|[bot-add](#bot-add)|[bot-remove](#bot-remove)|[bot-status](#bot-status)|[invite-url](#invite-url)|[league-create](#league-create)|[log-level](#log-level)|
|[restart](#restart)|[ticket-add](#ticket-add)|[ticket-remove](#ticket-remove)|



## bot-add

**Format:** `!bot-add <steamid_64> <account_name> <persona_name> <password>`

> Add a bot to the inhouse league.

**Guild only**

**Aliases:** `bot-create`, `bot-update`, `add-bot`, `create-bot`, `update-bot`, `botadd`, `botcreate`, `botupdate`, `addbot`, `createbot`, `updatebot`

**Usage Examples:**
* `!bot-add steamid_64 account_name persona_name password`
 
 
## bot-remove

**Format:** `!bot-remove <steamid_64>`

> Remove a bot from the inhouse league.

**Guild only**

**Aliases:** `bot-delete`, `bot-destroy`, `delete-bot`, `remove-bot`, `destroy-bot`, `botremove`, `botdelete`, `botdestroy`, `deletebot`, `removebot`, `destroybot`

**Usage Examples:**
* `!bot-remove steamid_64`
 
 
## bot-status

**Format:** `!bot-status <steamid_64> <status>`

> Manually set a bot status.

**Guild only**

**Aliases:** `botstatus`

**Usage Examples:**
* `!bot-status 76561197960287930 BOT_UNAVAILABLE`
* `!bot-status 76561197960287930 BOT_ONLINE`
* `!bot-status 76561197960287930 BOT_OFFLINE`
 
 
## invite-url

**Format:** `!invite-url`

> Get the discord invite link to add the bot to your server.



**Aliases:** `invite-link`, `bot-invite`, `invite-bot`, `inviteurl`, `invitelink`, `botinvite`, `invitebot`

 
## league-create

**Format:** `!league-create`

> Create an inhouse league for the server.

**Guild only**

**Aliases:** `leaguecreate`

 
## log-level

**Format:** `!log-level <level>`

> Change the level of logging to one of error, warn, info, verbose, debug, silly.

**Guild only**

**Aliases:** `logger-level`, `loglevel`, `loggerlevel`

**Usage Examples:**
* `!log-level silly`
* `!log-level debug`
* `!log-level verbose`
* `!log-level info`
* `!log-level warn`
* `!log-level error`
 
 
## restart

**Format:** `!restart`

> Restart the bot.

**Guild only**



 
## ticket-add

**Format:** `!ticket-add <leagueid> <name>`

> Add a dota ticket to the league.

**Guild only**

**Aliases:** `add-ticket`, `ticketadd`, `addticket`

**Usage Examples:**
* `!ticket-add 1063 TicketName`
 
 
## ticket-remove

**Format:** `!ticket-remove <leagueid>`

> Remove a dota ticket from the league.

**Guild only**

**Aliases:** `remove-ticket`, `ticketremove`, `removeticket`

**Usage Examples:**
* `!ticket-remove 1063`
 
 