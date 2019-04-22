const { spawn: childProcessSpawn } = require('child_process');
const Promise = require('bluebird');

/**
 * @memberof module:util
 */
const spawn = (command, args = [], opts = {}) => new Promise(((resolve, reject) => {
    const child = childProcessSpawn(command, args, opts);

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

module.exports = spawn;
