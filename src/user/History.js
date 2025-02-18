const { storage } = require("uxp");
const fs = storage.localFileSystem;

/**
 * Ps Command Palette User History.
 */
class History {
    constructor() {
        this.data = null;
        this.latches = null;
        this.recent = null;
        this.fileName = "history.json";
        this.file = null;
    }

    /**
     * Load the user history file.
     */
    async load() {
        console.log("Loading user history...");
        try {
            const dataFolder = await fs.getDataFolder();
            this.file = await dataFolder.getEntry(this.fileName);
            const fileData = await this.file.read({ format: storage.formats.utf8 });
            this.data = JSON.parse(fileData);
        } catch (error) {
            console.error(error);
            this.data = [];

            if (!this.file) return;

            // create backup
            const backupFile = await this.backup();
            if (backupFile) {
                app.showAlert(
                    "User history error\n\nThere was an error reading your user history file so a backup was created. Use the command 'Open Plugin Data Folder' to view the backup file."
                );
            }
        }
        this.buildQueryLatches();
        this.buildRecencyLUT();
    }

    /**
     * Build a lookup table of total occurrences of each command in the history.
     */
    buildRecencyLUT() {
        this.recent = this.data.reduce((obj, { commandID }) => {
            obj[commandID] = (obj[commandID] || 0) + 1;
            return obj;
        }, {});
    }

    /**
     * Determines the most frequently associated commandID for each query in the history.
     * If multiple commandIDs have the same frequency, the one that appears first (most recent) takes precedence.
     */
    buildQueryLatches() {
        const queryMap = new Map();
        for (const { query, commandID } of this.data) {
            if (!queryMap.has(query)) {
                queryMap.set(query, new Map());
            }
            const cmdMap = queryMap.get(query);
            cmdMap.set(commandID, (cmdMap.get(commandID) || 0) + 1);
        }

        const latches = {};

        for (const [query, cmdMap] of queryMap.entries()) {
            let maxCount = -1;
            let mostFrequentCommand = null;

            for (const [commandID, count] of cmdMap.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    mostFrequentCommand = commandID;
                }
            }
            latches[query] = mostFrequentCommand;
        }

        this.latches = latches;
    }

    /**
     * Reload all user history from disk.
     */
    async reload() {
        this.data = null;
        this.latches = {};
        this.file = null;
        await this.load();
    }

    /**
     * Write user history to disk.
     * @returns {storage.File|void}
     */
    async write() {
        console.log("Writing user history...");
        if (this.data == {} || this.data === null) {
            console.log("No user data to write");
            return;
        }
        try {
            const dataFolder = await fs.getDataFolder();
            if (!this.file) {
                this.file = await dataFolder.createEntry(this.fileName, {
                    type: storage.types.file,
                    overwrite: true,
                });
            }
            this.data.timestamp = Date.now();
            await this.file.write(JSON.stringify(this.data), { append: false });
            this.buildQueryLatches();
            this.buildRecencyLUT();
        } catch (error) {
            console.error(error);
            app.showAlert(
                "User history error\n\nThere was an error writing your user history file."
            );
        }
    }

    /**
     * Backup the user history file.
     * @returns {storage.File|void}
     */
    async backup() {
        if (!this.file) return;

        try {
            const dataFolder = await fs.getDataFolder();
            const f = this.file;
            const backupName = `${f.name}.bak`;

            await dataFolder.renameEntry(f, backupName, { overwrite: true });
            console.log("User history file backed up to:", f.nativePath);

            return f;
        } catch (error) {
            console.error(error);
            app.showAlert(
                "User history error\n\nAn error occurred while backing up your user history file."
            );
        }
    }

    /**
     * Add an item to the user command history.
     * @param {string} query Palette query string
     * @param {string} commandID Selected command id
     */
    add(query, commandID) {
        if (!query || !commandID) return;

        // TODO: limit history length
        this.data.unshift({
            query: query,
            commandID: commandID,
            timestamp: Date.now(),
        });
        this.write();
    }

    async clear() {
        this.data = [];
        await this.write();
        await this.reload();
        app.showAlert("History cleared");
    }
}

module.exports = {
    History,
};
