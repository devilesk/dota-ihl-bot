const { spawn } = require('child_process');
const Promise = require('bluebird');

module.exports = (command, args) => new Promise(((resolve, reject) => {
    const child = spawn(command, args || []);

    child.stdout.on('data', (data) => {
        process.stdout.write(data);
    });

    child.on('error', (data) => {
        reject(data);
    });

    child.on('exit', () => {
        resolve(true);
    });
}));
