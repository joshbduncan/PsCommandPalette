const commandGroups = {
    channel: require("./channel.js"),
    channels: require("./channels.js"),
    document: require("./document.js"),
    layer: require("./layer.js"),
    guides: require("./guides.js"),
};

const apiCommands = Object.values(commandGroups).reduce((acc, groupCommands) => {
    Object.values(groupCommands).forEach((command) => {
        Object.assign(acc, command);
    });
    return acc;
}, {});

module.exports = {
    apiCommands,
};
