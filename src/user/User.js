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
        this._dataFolder = null;
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
            startupCommands: ["ps_plugin_about"], // TODO: add default plugin startup commands with about, docs, etc.
        };
    }

    /**
     * Validate user data structure and fix common issues.
     * @returns {boolean} - True if data was valid, false if corrections were made
     */
    validateData() {
        if (!this.data || typeof this.data !== "object") {
            this.data = this.defaultData;
            return false;
        }

        // Ensure required properties exist
        const required = [
            "bookmarks",
            "disabledCommandTypes",
            "hiddenCommands",
            "pickers",
            "startupCommands",
        ];
        let isValid = true;

        required.forEach((prop) => {
            if (!Array.isArray(this.data[prop])) {
                this.data[prop] = [];
                isValid = false;
            }
        });

        // Ensure plugin and app info exists
        if (!this.data.plugin || typeof this.data.plugin !== "object") {
            this.data.plugin = this.defaultData.plugin;
            isValid = false;
        }
        if (!this.data.app || typeof this.data.app !== "object") {
            this.data.app = this.defaultData.app;
            isValid = false;
        }

        return isValid;
    }

    /**
     * Get cached data folder handle.
     * @returns {Promise<storage.Folder>}
     */
    async getDataFolder() {
        if (!this._dataFolder) {
            this._dataFolder = await fs.getDataFolder();
        }
        return this._dataFolder;
    }

    /**
     * Load the user data file.
     */
    /**
     * Create backup on error.
     */
    async createBackupOnError() {
        if (!this.file) return;
        try {
            const backupFile = await this.backup();
            if (backupFile) {
                app.showAlert(
                    "User data error\n\nThere was an error reading your user data file so a backup was created. Use the command 'Open Plugin Data Folder' to view the backup file."
                );
            }
        } catch (backupError) {
            console.error("Failed to create backup:", backupError);
        }
    }

    async load() {
        console.log("Loading user data...");
        try {
            const dataFolder = await this.getDataFolder();
            this.file = await dataFolder.getEntry(this.fileName);
            const fileData = await this.file.read({ format: storage.formats.utf8 });
            this.data = JSON.parse(fileData);

            // Validate and migrate data if needed
            if (!this.validateData()) {
                console.warn("Data validation failed, saving corrected version");
                await this.write();
            }
        } catch (error) {
            if (error.code === "ENOENT" || error.name === "EntryNotFoundError") {
                // File doesn't exist - use defaults (first run)
                console.log("User data file not found, using defaults.");
                this.data = this.defaultData;
            } else if (error instanceof SyntaxError) {
                // JSON parse error - corrupt file
                console.error("User data file corrupted (JSON parse error):", error);
                await this.createBackupOnError();
                this.data = this.defaultData;
            } else {
                // Other error - backup and use defaults
                console.error("User data load error:", error);
                await this.createBackupOnError();
                this.data = this.defaultData;
            }
        }
    }

    /**
     * Reload all user data from disk.
     */
    async reload() {
        this.data = null;
        this.file = null;
        this._dataFolder = null;
        await this.load();
    }

    /**
     * Write user data to disk using atomic write with backup.
     * @returns {Promise<void>}
     */
    async write() {
        if (!this.data || Object.keys(this.data).length === 0) {
            return;
        }

        // Validate data before writing
        if (!this.validateData()) {
            console.warn(
                "User data validation failed during write, using corrected data"
            );
        }

        console.log("Writing user data.");
        try {
            const dataFolder = await this.getDataFolder();
            const tempFileName = `${this.fileName}.tmp`;

            // Write to temp file first (atomic operation)
            const tempFile = await dataFolder.createEntry(tempFileName, {
                type: storage.types.file,
                overwrite: true,
            });

            this.data.timestamp = Date.now();
            const jsonData = JSON.stringify(this.data, null, 2);
            await tempFile.write(jsonData, { append: false });

            // Create backup of existing file if it exists
            if (this.file) {
                try {
                    await dataFolder.renameEntry(this.file, `${this.fileName}.bak`, {
                        overwrite: true,
                    });
                } catch (backupError) {
                    console.warn("Could not create backup:", backupError);
                    // Continue with write even if backup fails
                }
            }

            // Atomic rename temp file to final file
            this.file = await dataFolder.renameEntry(tempFile, this.fileName, {
                overwrite: true,
            });

            console.log("User data written successfully.");

            // Invalidate cached data
            if (typeof globalThis !== "undefined" && globalThis.invalidateUserData) {
                globalThis.invalidateUserData();
            }
        } catch (error) {
            console.error("User data write failed:", error);
            app.showAlert(
                "User data error\n\nThere was an error writing your user data file."
            );
            throw error; // Re-throw so caller can handle if needed
        }
    }

    /**
     * Backup the user data file.
     * @returns {storage.File|void}
     */
    async backup() {
        if (!this.file) return;

        try {
            const dataFolder = await this.getDataFolder();
            const f = this.file;
            const backupName = `${f.name}.bak`;

            await dataFolder.renameEntry(f, backupName, { overwrite: true });
            console.log(`Backing up user data file to ${f.nativePath}.`);

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
            const dataFolder = await this.getDataFolder();
            await shell.openPath(dataFolder.nativePath);
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = {
    User,
};
