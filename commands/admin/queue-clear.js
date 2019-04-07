const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');

/**
 * @class QueueClearCommand
 * @extends IHLCommand
 */
module.exports = class QueueClearCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'queue-clear',
            aliases: ['qclear', 'clear'],
            group: 'admin',
            memberName: 'queue-clear',
            guildOnly: true,
            description: 'Clear inhouse queue.',
            examples: ['queue-clear', 'queueclear', 'qclear', 'clear'],
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild }) {
        await Db.destroyQueuesByGuildId(guild.id);
        await msg.say('Queue cleared.');
    }
};
