const { Command } = require('discord.js-commando');
const convertor = require('steam-id-convertor');
const {
    ihlManager, getLobbyFromMessage, getInhouse, isMessageFromAdmin,
} = require('../../lib/ihlManager');
const { findUserByDiscordId } = require('../../lib/db');

module.exports = class LobbyKickCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'lobby-kick',
            group: 'admin',
            memberName: 'lobby-kick',
            guildOnly: true,
            description: 'Kick a user from a lobby.',
            examples: ['lobby-kick @devilesk'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a user to kick.',
                    type: 'member',
                },
            ],
        });
    }

    hasPermission(msg) {
        return isMessageFromAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg, { member }) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const [lobbyState] = getLobbyFromMessage(ihlManager.inhouseStates, msg);

        if (lobbyState) {
            await member.removeRole(lobbyState.role);

            const user = await findUserByDiscordId(guild.id)(discord_id);
            if (user) {
                const account_id = convertor.to32(user.steamid_64);
                await lobbyState.dotaBot.practiceLobbyKick(account_id);
                msg.say('User kicked from lobby.');
            }
            else {
                await msg.say('User not found. (Has user registered with `!register`?)');
            }
        }
        else {
            await msg.say('Not in a lobby channel.');
        }
    }
};
