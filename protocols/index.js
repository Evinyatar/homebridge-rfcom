var protocolMap = {};

function addHandler(handler) {
    protocolMap[handler.protocolId] = handler;
}

addHandler(require('./chacondio'));
addHandler(require('./somfy'));

module.exports = protocolMap;