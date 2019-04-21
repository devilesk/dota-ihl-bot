const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');

/**
 * @class LogLevelCommand
 * @extends IHLCommand
 */
module.exports = class LogLevelCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'log-level',
            aliases: ['logger-level'],
            group: 'owner',
            memberName: 'log-level',
            guildOnly: true,
            description: `Change the level of logging to one of ${LogLevelCommand.logLevels.join(', ')}.`,
            examples: ['log-level silly', 'log-level debug', 'log-level verbose', 'log-level info', 'log-level warn', 'log-level error'],
            args: [
                {
                    key: 'level',
                    prompt: 'Provide a log level.',
                    type: 'string',
                    validate: (level) => {
                        if (LogLevelCommand.logLevels.indexOf(level) !== -1) return true;
                        return `Value must be a valid level: ${LogLevelCommand.logLevels.join(', ')}`;
                    },
                },
            ],
        }, {
            clientOwner: true,
            inhouseAdmin: false,
            inhouseState: false,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    static get logLevels() {
        return ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];
    }

    async onMsg({ msg }, { level }) {
        const oldLevel = logger.level;
        logger.level = level;
        return msg.say(`Log level changed from ${oldLevel} to ${level}.`);
    }
};
