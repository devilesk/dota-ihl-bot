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
    getLobbyByChannelId: sinon.stub(),
    isMessageFromAnyInhouse: sinon.stub(),
    isMessageFromAnyInhouseAdmin: sinon.stub(),
    isMessageFromAnyInhouseLobby: sinon.stub(),
    parseMessage: sinon.stub(),
    getLobbyFromMessage: sinon.stub(),
    sendMatchEndMessage: sinon.stub(),
    initLeague: sinon.stub(),
    IHLManager: sinon.stub(),
    ihlManager: {
        createNewLeague: sinon.stub(),
    },
};