const IHLCommand = require('../../lib/ihlCommand');
const {
    createNewLeague,
} = require('../../lib/ihl');

/**
 * @class LeagueCreateCommand
 * @extends IHLCommand
 */
module.exports = class LeagueCreateCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'league-create',
            group: 'admin',
            memberName: 'league-create',
            guildOnly: true,
            description: 'Create an inhouse league for the server.',
        }, {
            clientOwner: true,
            inhouseAdmin: false,
            inhouseState: false,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, inhouseState, guild }) {
        if (!inhouseState) {
            await createNewLeague(guild);
            await msg.say('Inhouse league created.');
        }
        else {
            await msg.say('Inhouse league already exists.');
        }
    }
};
