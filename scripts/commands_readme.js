require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const Mocks = require('../test/mocks');
const partition = require('../lib/util/partition');
const logger = require('../lib/logger');

const client = new Mocks.MockClient();
const commands = new Mocks.MockCommands(client);

// eslint-disable-next-line no-unused-vars
const argToString = (arg) => {
    if (arg.default === null) {
        // eslint-disable-next-line no-useless-escape
        return `\<${arg.label}\>`;
    }
    // eslint-disable-next-line no-useless-escape
    return `[\<${arg.label}\>]`;
};

const commandsArray = Object.values(commands.registry);
const commandGroups = {};
for (const command of commandsArray) {
    commandGroups[command.groupID] = commandGroups[command.groupID] || [];
    commandGroups[command.groupID].push(command);
}

const generateReadme = (key, cmds) => {
    const sortedCommands = cmds.sort((a, b) => {
        if (a.name > b.name) {
            return 1;
        }
        return -1;
    });

    const rowLen = Math.min(sortedCommands.length, 6);
    const toc = partition(sortedCommands, rowLen);

    ejs.renderFile(path.join(__dirname, 'commands_readme.ejs'), { commands: sortedCommands, toc, rowLen, argToString }, {}, (err, str) => {
        if (err) logger.error(err);
        // eslint-disable-next-line no-shadow
        fs.writeFile(path.join(__dirname, `../commands/${key}/README.md`), str, 'utf8', (err) => {
            if (err) logger.error(`error ${key}`);
        });
    });
};

for (const key of Object.keys(commandGroups)) {
    generateReadme(key, commandGroups[key]);
}
