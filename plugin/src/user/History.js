const { storage } = require("uxp");
const fs = storage.localFileSystem;

const { alertDialog } = require("../dialogs/alert.js");

/**
 * Ps Command Palette User History.
 */
class History {
    /**
     * Create a History object.
     */
    constructor() {
        this.data = null;
        this.fileName = "history.json";
        this.file = null;
    }

    /**
     * Load the user history file.
     */
    async load() {
        const dataFolder = await fs.getDataFolder();
        console.log("Loading user history:", dataFolder.nativePath);

        try {
            this.file = await dataFolder.getEntry(this.fileName);
            const fileData = await this.file.read({ format: storage.formats.utf8 });
            this.data = JSON.parse(fileData);
        } catch (error) {
            console.error("Error loading user history file:", error);
            this.data = [];

            // create backup
            // TODO: overwrite old file
            const backupFilePath = await this.backup();
            if (backupFilePath) {
                await alertDialog(
                    "User Data Error",
                    `There was an error reading your user history file. A backup was created at: ${backupFilePath}`
                );
            }
        }

        return this.data;
    }

    /**
     * Reload all user history from disk.
     */
    async reload() {
        this.data = null;
        this.file = null;
        await this.load();
    }

    /**
     * Write user history to disk.
     * @returns {storage.<File>|void}
     */
    async write() {
        console.log("Writing user history");
        if (this.data == {} || this.data === null) {
            console.log("No user data to write...");
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
            console.log(this.file.nativePath);

            this.data.timestamp = Date.now();
            await this.file.write(JSON.stringify(this.data), { append: false });
        } catch (error) {
            console.error("Error writing user history file:", error);
            await alertDialog(
                "User Data Error",
                "There was an error writing your user history file."
            );
        }
    }

    /**
     * Backup the user history file.
     * @returns {string|void} File path of the backup file.
     */
    async backup() {
        if (!this.file) return;

        try {
            const dataFolder = await fs.getDataFolder();
            const f = this.file;

            await dataFolder.renameEntry(f, f.name + ".bak");
            console.log("User history file backed up to:", f.nativePath);
            return f.nativePath;
        } catch (error) {
            console.error("Error creating user history backup file:", error);
            await alertDialog(
                "User Data Error",
                "There was an error backing up your user history file."
            );
            return;
        }
    }

    /**
     * Add an item to the user command history.
     * @param {string} query Palette query string
     * @param {string} commandID Selected command id
     */
    async add(query, commandID) {
        if (!query || !commandID) return;

        // TODO: limit history length
        this.data.unshift({
            query: query,
            commandID: commandID,
            timestamp: Date.now(),
        });
        await this.write();
    }
}

module.exports = {
    History,
};
