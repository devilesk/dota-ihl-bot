const logger = require('./../../logger');
const { Command } = require('discord.js-commando');
const db = require('../../models');
const Promise = require('bluebird');

module.exports = class CommendCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'commend',
            group: 'ihl',
            memberName: 'commend',
            guildOnly: true,
            description: 'Commend a player after a game.',
            examples: ['commend @Ari*', 'commend Sasquatch'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a player name or mention.',
                    type: 'string',
                },
            ],
        });
    }

    async run(msg, { member }) {

    }
};
