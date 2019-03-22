const IHLCommand = require('../../lib/ihlCommand');
const {
    createSeason,
} = require('../../lib/db');

/**
 * @class LeagueSeasonCommand
 * @extends IHLCommand
 */
module.exports = class LeagueSeasonCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'league-season',
            group: 'admin',
            memberName: 'league-season',
            guildOnly: true,
            description: 'Start a new inhouse league season.',
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild }) {
        await createSeason(guild.id);
        await msg.say('New league season started.');
    }
};
