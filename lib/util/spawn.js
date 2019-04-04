const { spawn } = require('child_process')
const Promise = require('bluebird');

module.exports = (command, args) => {
    return new Promise(function (resolve, reject) {
        const child = spawn(command, args || []);

        child.stdout.on('data', function (data) {
            process.stdout.write(data);
        });

        child.on('error', function (data) {
            reject(data);
        });

        child.on('exit', function () {
            resolve(true);
        });
    });
}