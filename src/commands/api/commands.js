const { _channel } = require("./channel.js");
const { _channels } = require("./channels.js");
const { _document } = require("./document.js");
const { _guides } = require("./guides.js");
const { _layer } = require("./layer.js");

const apiCommands = {};

Object.assign(apiCommands, _channel);
Object.assign(apiCommands, _channels);
Object.assign(apiCommands, _document);
Object.assign(apiCommands, _guides);
Object.assign(apiCommands, _layer);

module.exports = {
    apiCommands,
};
