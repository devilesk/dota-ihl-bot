const sinon = require('sinon');

module.exports = {
    findUser: sinon.stub(),
    getInhouseState: sinon.stub(),
    getIndexOfInhouseState: sinon.stub(),
    transformLeagueGuild: sinon.stub(),
    addInhouseState: sinon.stub(),
    loadInhouseState: sinon.stub(),
    loadInhouseStates: sinon.stub(),
    loadInhouseStatesFromLeagues: sinon.stub(),
    sendMatchEndMessage: sinon.stub(),
    initLeague: sinon.stub(),
    IHLManager: sinon.stub(),
    ihlManager: {
        createNewLeague: sinon.stub(),
    },
};