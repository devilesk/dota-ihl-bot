|Table of Contents| | | | | |
|--|--|--|--|--|--|
|[bot-add](#bot-add)|[bot-remove](#bot-remove)|[bot-status](#bot-status)|[dump-members](#dump-members)|[invite-url](#invite-url)|[league-create](#league-create)|
|[log-level](#log-level)|[restart](#restart)|[ticket-add](#ticket-add)|[ticket-remove](#ticket-remove)|



## bot-add

**Format:** `!bot-add <steamId64> <accountName> <personaName> <password>`

> Add a bot to the inhouse league.

**Requirements:** Owner, Vouched

**Aliases:** `bot-create`, `bot-update`, `add-bot`, `create-bot`, `update-bot`, `botadd`, `botcreate`, `botupdate`, `addbot`, `createbot`, `updatebot`

**Usage Examples:**
* `!bot-add steamId64 accountName personaName password`
 
 
## bot-remove

**Format:** `!bot-remove <steamId64>`

> Remove a bot from the inhouse league.

**Requirements:** Owner, Vouched

**Aliases:** `bot-delete`, `bot-destroy`, `delete-bot`, `remove-bot`, `destroy-bot`, `botremove`, `botdelete`, `botdestroy`, `deletebot`, `removebot`, `destroybot`

**Usage Examples:**
* `!bot-remove steamId64`
 
 
## bot-status

**Format:** `!bot-status <steamId64> <status>`

> Manually set a bot status.

**Requirements:** Owner, Vouched

**Aliases:** `botstatus`

**Usage Examples:**
* `!bot-status 76561197960287930 BOT_UNAVAILABLE`
* `!bot-status 76561197960287930 BOT_ONLINE`
* `!bot-status 76561197960287930 BOT_OFFLINE`
 
 
## dump-members

**Format:** `!dump-members [<format>]`

> Dumps all guild member info.

**Requirements:** Guild, Owner, Vouched

**Aliases:** `members-dump`, `dumpmembers`, `membersdump`

 
## invite-url

**Format:** `!invite-url`

> Get the discord invite link to add the bot to your server.

**Requirements:** Owner, Vouched

**Aliases:** `invite-link`, `bot-invite`, `invite-bot`, `inviteurl`, `invitelink`, `botinvite`, `invitebot`

 
## league-create

**Format:** `!league-create`

> Create an inhouse league for the server.

**Requirements:** Guild, Owner, Vouched

**Aliases:** `leaguecreate`

 
## log-level

**Format:** `!log-level <level>`

> Change the level of logging to one of error, warn, info, verbose, debug, silly.

**Requirements:** Owner, Vouched

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

**Requirements:** Owner, Vouched



 
## ticket-add

**Format:** `!ticket-add <leagueid> <name>`

> Add a dota ticket to the league.

**Requirements:** Guild, Owner, Inhouse, Vouched

**Aliases:** `add-ticket`, `ticketadd`, `addticket`

**Usage Examples:**
* `!ticket-add 1063 TicketName`
 
 
## ticket-remove

**Format:** `!ticket-remove <leagueid>`

> Remove a dota ticket from the league.

**Requirements:** Guild, Owner, Inhouse, Vouched

**Aliases:** `remove-ticket`, `ticketremove`, `removeticket`

**Usage Examples:**
* `!ticket-remove 1063`
 
 