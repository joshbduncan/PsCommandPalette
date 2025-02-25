const { app } = require("photoshop");
const { shell, storage } = require("uxp");
const fs = storage.localFileSystem;

/**
 * Ps Command Palette User Data.
 */
class User {
    constructor() {
        this.data = null;
        this.fileName = "user.json";
        this.file = null;
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
            bookmarks: [],
            disabledCommandTypes: [], // TODO: allow command types to be disabled all together
            hiddenCommands: [], // TODO: build out skips for hidden commands
            pickers: [],
            scripts: [],
            startupCommands: ["ps_plugin_about"], // TODO: add default plugin startup commands with about, docs, etc.
        };
    }

    /**
     * Load the user data file.
     */
    async load() {
        console.log("loading user data");
        try {
            const dataFolder = await fs.getDataFolder();
            this.file = await dataFolder.getEntry(this.fileName);
            const fileData = await this.file.read({ format: storage.formats.utf8 });
            this.data = JSON.parse(fileData);
        } catch (error) {
            console.warn(error);
            this.data = this.defaultData;
            console.log("using default user data");

            if (!this.file) return;

            // create backup
            const backupFile = this.backup();
            if (backupFile) {
                app.showAlert(
                    "User data error\n\nThere was an error reading your user data file so a backup was created. Use the command 'Open Plugin Data Folder' to view the backup file."
                );
            }
        }
    }

    /**
     * Reload all user data from disk.
     */
    async reload() {
        this.data = null;
        this.file = null;
        await this.load();
    }

    /**
     * Write user data to disk.
     * @returns {storage.File|void}
     */
    async write() {
        if (this.data == {} || this.data === null) {
            return;
        }
        console.log("writing user data");
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
        } catch (error) {
            console.error(error);
            app.showAlert(
                "User data error\n\nThere was an error writing your user data file."
            );
        }
    }

    /**
     * Backup the user data file.
     * @returns {storage.File|void}
     */
    async backup() {
        if (!this.file) return;

        try {
            const dataFolder = await fs.getDataFolder();
            const f = this.file;
            const backupName = `${f.name}.bak`;

            await dataFolder.renameEntry(f, backupName, { overwrite: true });
            console.log(`backing up user data file to ${f.nativePath}`);

            return f;
        } catch (error) {
            console.error(error);
            app.showAlert(
                "User data error\n\nAn error occurred while backing up your user data file."
            );
        }
    }

    /**
     * Open the user data folder in the file system explorer.
     */
    async reveal() {
        try {
            const dataFolder = await fs.getDataFolder();
            await shell.openPath(dataFolder.nativePath);
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = {
    User,
};
