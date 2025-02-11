const { app } = require("photoshop");
const { storage } = require("uxp");
const fs = storage.localFileSystem;
const shell = require("uxp").shell;

/**
 * Ps Command Palette User Data.
 */
class User {
    /**
     * Create a User object.
     */
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
            hiddenCommands: [], // TODO: build out skips for hidden commands
            disabledCommandTypes: [], // TODO: allow command types to be disabled all together
            startupCommands: ["ps_builtin_about"], // TODO: add default builtin startup commands with about, docs, etc.
        };
    }

    /**
     * Load the user data file.
     */
    async load() {
        console.log("Loading user data:");
        try {
            const dataFolder = await fs.getDataFolder();
            this.file = await dataFolder.getEntry(this.fileName);
            const fileData = await this.file.read({ format: storage.formats.utf8 });
            this.data = JSON.parse(fileData);
        } catch (error) {
            console.error(error);
            this.data = this.defaultData;
            console.log("Using default user data");

            if (!this.file) return;

            // create backup
            const backupFile = this.backup();
            if (backupFile) {
                app.showAlert(
                    "User Data Error!\n\nThere was an error reading your user data file so a backup was created. Use the command 'Open Plugin Data Folder' to view the backup file."
                );
            }
        }

        return this.data;
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
        console.log("Writing user data");
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
            this.data.timestamp = Date.now();
            await this.file.write(JSON.stringify(this.data), { append: false });
        } catch (error) {
            console.error(error);
            app.showAlert(
                "User Data Error!\n\nThere was an error writing your user data file."
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
            console.log("User data file backed up to:", nativePath);

            return f;
        } catch (error) {
            console.error(error);
            app.showAlert(
                "User Data Error!\n\nAn error occurred while backing up your user data file."
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
