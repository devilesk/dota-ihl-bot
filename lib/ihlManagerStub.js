const sinon = require('sinon');

module.exports = {
    findUser: sinon.stub(),
    loadInhouseStates: sinon.stub(),
    loadInhouseStatesFromLeagues: sinon.stub(),
    sendMatchEndMessage: sinon.stub(),
    initLeague: sinon.stub(),
    IHLManager: sinon.stub(),
    ihlManager: {
    },
};