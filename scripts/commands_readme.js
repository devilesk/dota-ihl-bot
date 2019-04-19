const dotenv = require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const Mocks = require('../test/mocks');
const client = new Mocks.MockClient();
const commands = new Mocks.MockCommands(client);

var partition = function(arr, length) {
    var result = [];
    for(var i = 0; i < arr.length; i++) {
        if (i % length === 0) {
            result.push([]);
        }
        result[result.length - 1].push(arr[i]);
    }
    return result;
};

const argToString = arg => {
    if (arg.default === null) {
        return `<${arg.label}>`;
    }
    else {
        return `[<${arg.label}>]`;
    }
}

const commandsArray = Object.values(commands.registry);
const commandGroups = {}
for (const command of commandsArray) {
    commandGroups[command.groupID] = commandGroups[command.groupID] || [];
    commandGroups[command.groupID].push(command);
}

const generateReadme = (key, commands) => {
    const sortedCommands = commands.sort((a, b) => {
        if (a.name > b.name) {
            return 1;
        }
        return -1;
    });

    const rowLen = Math.min(sortedCommands.length, 6);
    const toc = partition(sortedCommands, rowLen);

    ejs.renderFile(path.join(__dirname, 'commands_readme.ejs'), { commands: sortedCommands, toc, rowLen }, {}, (err, str) => {
        if (err) console.log(err);
        fs.writeFile(path.join(__dirname, `../commands/${key}/README.md`), str, 'utf8', (err) => {
            if (err) console.log(`error ${command.name}`);
        });
    });
}

for (const key of Object.keys(commandGroups)) {
    generateReadme(key, commandGroups[key]);
}
