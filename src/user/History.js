const { app } = require("photoshop");
const { storage } = require("uxp");
const fs = storage.localFileSystem;

/**
 * Ps Command Palette User History.
 */
class History {
    constructor() {
        this.data = [];
        this.latches = null;
        this.occurrencesLUT = null;
        this.recencyLUT = null;
        this.fileName = "history.json";
        this.file = null;
        this._dataFolder = null;
    }

    get commandIDs() {
        return [...new Set(this.data.map((entry) => entry.commandID))];
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
     * Validate history data structure and fix common issues.
     * @returns {boolean} - True if data was valid, false if corrections were made
     */
    validateData() {
        if (!Array.isArray(this.data)) {
            this.data = [];
            return false;
        }

        let isValid = true;
        const validEntries = [];

        for (const entry of this.data) {
            // Validate each history entry
            if (
                entry &&
                typeof entry === "object" &&
                typeof entry.commandID === "string" &&
                typeof entry.query === "string" &&
                typeof entry.timestamp === "number"
            ) {
                validEntries.push(entry);
            } else {
                console.warn("Invalid history entry removed:", entry);
                isValid = false;
            }
        }

        if (validEntries.length !== this.data.length) {
            this.data = validEntries;
            isValid = false;
        }

        return isValid;
    }

    /**
     * Create backup on error.
     */
    async createBackupOnError() {
        if (!this.file) return;
        try {
            const backupFile = await this.backup();
            if (backupFile) {
                app.showAlert(
                    "User history error\n\nThere was an error reading your user history file so a backup was created. Use the command 'Open Plugin Data Folder' to view the backup file."
                );
            }
        } catch (backupError) {
            console.error("Failed to create history backup:", backupError);
        }
    }

    /**
     * Load the user history file.
     */
    async load() {
        console.log("Loading user history...");
        try {
            const dataFolder = await this.getDataFolder();
            this.file = await dataFolder.getEntry(this.fileName);
            const fileData = await this.file.read({ format: storage.formats.utf8 });
            this.data = JSON.parse(fileData);

            // Validate and clean data if needed
            if (!this.validateData()) {
                console.warn("History validation failed, saving corrected version");
                await this.write();
            }
        } catch (error) {
            if (error.code === "ENOENT" || error.name === "EntryNotFoundError") {
                // File doesn't exist - use empty array (first run)
                console.log("History file not found, starting with empty history");
                this.data = [];
            } else if (error instanceof SyntaxError) {
                // JSON parse error - corrupt file
                console.error("History file corrupted (JSON parse error):", error);
                await this.createBackupOnError();
                this.data = [];
            } else {
                // Other error - backup and use empty array
                console.error("History load error:", error);
                await this.createBackupOnError();
                this.data = [];
            }
        }

        // Always rebuild lookup tables after loading
        this.buildQueryLatches();
        this.buildRecencyLUT();
        this.buildOccurrencesLUT();
    }

    /**
     * Build a lookup table assigning scores based on history position (most recent = highest).
     */
    buildRecencyLUT() {
        const lut = new Map();
        for (let i = 0; i < this.data.length; i++) {
            lut.set(this.data[i].commandID, this.data.length - i);
        }
        this.recencyLUT = lut;
    }

    /**
     * Build a lookup table of total occurrences of each command in the history.
     */
    buildOccurrencesLUT() {
        this.occurrencesLUT = this.data.reduce((obj, { commandID }) => {
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
            // skip commands ran from startupCommands (empty query)
            if (query === "") continue;
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
        this.data = [];
        this.latches = null;
        this.occurrencesLUT = null;
        this.recencyLUT = null;
        this.file = null;
        this._dataFolder = null;
        await this.load();
    }

    /**
     * Write user history to disk using atomic write with backup.
     * @returns {Promise<void>}
     */
    async write() {
        if (!this.data || !Array.isArray(this.data) || this.data.length === 0) {
            return;
        }

        // Validate data before writing
        if (!this.validateData()) {
            console.warn(
                "History data validation failed during write, using corrected data"
            );
        }

        console.log("Writing user history");
        try {
            const dataFolder = await this.getDataFolder();
            const tempFileName = `${this.fileName}.tmp`;

            // Write to temp file first (atomic operation)
            const tempFile = await dataFolder.createEntry(tempFileName, {
                type: storage.types.file,
                overwrite: true,
            });

            // Add timestamp to data array (not individual entries)
            const dataToWrite = [...this.data];
            dataToWrite.timestamp = Date.now();

            const jsonData = JSON.stringify(dataToWrite, null, 2);
            await tempFile.write(jsonData, { append: false });

            // Create backup of existing file if it exists
            if (this.file) {
                try {
                    await dataFolder.renameEntry(this.file, `${this.fileName}.bak`, {
                        overwrite: true,
                    });
                } catch (backupError) {
                    console.warn("Could not create history backup:", backupError);
                    // Continue with write even if backup fails
                }
            }

            // Atomic rename temp file to final file
            this.file = await dataFolder.renameEntry(tempFile, this.fileName, {
                overwrite: true,
            });

            // Rebuild lookup tables after successful write
            this.buildQueryLatches();
            this.buildRecencyLUT();
            this.buildOccurrencesLUT();

            console.log("History data written successfully");

            // Invalidate cached data
            if (typeof globalThis !== "undefined" && globalThis.invalidateHistoryData) {
                globalThis.invalidateHistoryData();
            }
        } catch (error) {
            console.error("History data write failed:", error);
            app.showAlert(
                "User history error\n\nThere was an error writing your user history file."
            );
            throw error; // Re-throw so caller can handle if needed
        }
    }

    /**
     * Backup the user history file.
     * @returns {storage.File|void}
     */
    async backup() {
        if (!this.file) return;

        try {
            const dataFolder = await this.getDataFolder();
            const f = this.file;
            const backupName = `${f.name}.bak`;

            await dataFolder.renameEntry(f, backupName, { overwrite: true });
            console.log(`Backing up user history file to ${f.nativePath}.`);

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
     * @param {string} query - Palette query string
     * @param {string} commandID - Selected command id
     */
    add(query, commandID) {
        // Add new entry to beginning
        this.data.unshift({
            query: query,
            commandID: commandID,
            timestamp: Date.now(),
        });

        // Limit history length to prevent file bloat (keep last 1000 entries)
        const MAX_HISTORY_LENGTH = 1000;
        if (this.data.length > MAX_HISTORY_LENGTH) {
            this.data = this.data.slice(0, MAX_HISTORY_LENGTH);
        }

        this.write();
    }

    async clear() {
        this.data = [];
        await this.write();
        await this.reload();
        app.showAlert("History cleared!");
    }
}

module.exports = {
    History,
};
