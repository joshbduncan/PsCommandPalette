const { storage } = require("uxp");
const fs = storage.localFileSystem;

const { alertDialog } = require("./dialogs/alert.js");

/**
 * Ps Command Palette User Data.
 */
class User {
    /**
     * Create a User object.
     */
    constructor() {
        this.data = {};
        this.fileName = "pscp_user_data.json";
    }

    /**
     * Return a default object of sample user data.
     */
    get defaultData() {
        // FIXME: temp user data for testing
        return {
            plugin: {
                name: PLUGIN_NAME,
                version: PLUGIN_VERSION,
            },
            app: {
                name: HOST_NAME,
                version: HOST_VERSION,
                locale: HOST_LOCALE,
                os: HOST_OS,
            },
            hiddenCommands: [],
            history: [],
            // TODO: add default builtin startup commands with about, docs, etc.
            startupCommands: ["ps_menu_1030", "ps_menu_15204", "ps_menu_101"],
        };
    }

    /**
     * Load the user data file.
     */
    async load() {
        // https://developer.adobe.com/xd/uxp/develop/reference/uxp/module/storage/

        const dataFolder = await fs.getDataFolder();
        console.log("Loading user data:", dataFolder.nativePath);

        try {
            this.file = await dataFolder.getEntry(this.fileName);
            const fileData = await this.file.read({ format: storage.formats.utf8 });
            this.data = JSON.parse(fileData);
        } catch (error) {
            console.error("Error loading user data file");
            this.data = this.defaultData;

            // create backup
            const backupFilePath = await this.backup();
            if (backupFilePath) {
                await alertDialog(
                    "User Data Error",
                    `There was an error reading your user data file. A backup was created at: ${backupFilePath}`
                );
            }
        }

        return this.data;
    }

    /**
     * Reload all user data from disk.
     */
    async reload() {
        this.data = {};
        this.file = undefined;
        await this.load();
    }

    /**
     * Write user data to disk.
     * @returns {storage.<File>}
     */
    async write() {
        console.log("Writing user data");
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
            console.error("Error writing user data file:", error);
            await alertDialog(
                "User Data Error",
                "There was an error writing your user data file."
            );
        }
    }

    /**
     * Backup the user data file.
     * @returns {string|null} File path of the backup file.
     */
    async backup() {
        // TODO: add dialog with <sp-code> to display user data json file, maybe with save button (view user data) [docs](https://spectrum.adobe.com/page/code/)

        if (!this.file) return null;

        try {
            const dataFolder = await fs.getDataFolder();
            const f = this.file;

            await dataFolder.renameEntry(f, f.name + ".bak");
            console.log("User data file backed up to:", f.nativePath);
            return f.nativePath;
        } catch (error) {
            console.error("Error creating user data backup file:", error);
            await alertDialog(
                "User Data Error",
                "There was an error backing up your user data file."
            );
            return null;
        }
    }

    /**
     * Add an item to the user command history.
     * @param {string} query Palette query string
     * @param {string} commandID Selected command id
     */
    async historyAdd(query, commandID) {
        if (!query || !commandID) return;

        this.data.history.unshift({
            query: query,
            commandID: commandID,
            timestamp: Date.now(),
        });
        await this.write();
    }
}

module.exports = {
    User,
};
