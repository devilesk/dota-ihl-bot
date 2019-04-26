const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const fs = require('fs');
const Promise = require('bluebird');

/**
 * @class DumpMembersCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class DumpMembersCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'dump-members',
            aliases: ['members-dump'],
            group: 'owner',
            memberName: 'dump-members',
            guildOnly: true,
            description: 'Dumps all guild member info.',
            args: [
                {
                    key: 'format',
                    prompt: 'Provide an output file format. Valid formats: json, tsv',
                    type: 'string',
                    validate: (format) => {
                        if (format === 'json' || format === 'tsv') return true;
                        return 'Format must be `json` or `tsv`';
                    },
                    default: 'json',
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

    async onMsg({ msg, guild }, { format }) {
        await msg.say(`Dumping information on ${guild.members.size} members.`);

        const data = guild.members.array().map(member => ({
            discordId: member.id,
            nickname: member.nickname,
            username: member.user.username,
            discriminator: member.user.discriminator,
        }));

        let output = '';
        if (format === 'json') {
            output = JSON.stringify(data);
        }
        else {
            output += 'discordId\tnickname\tusername\tdiscriminator\n';
            output += data.map(row => `${row.discordId}\t${row.nickname}\t${row.username}\t${row.discriminator}`).join('\n');
        }

        return new Promise((resolve, reject) => {
            const outputFile = `members-${guild.id}-Date.now().${format}`;
            fs.writeFile(outputFile, output, 'utf8', (err) => {
                if (!err) {
                    resolve(msg.say(`Dumped member information to ${outputFile}.`));
                }
                else {
                    reject(err);
                }
            });
        });
    }
};
