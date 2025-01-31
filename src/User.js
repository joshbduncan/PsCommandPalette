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
    this.file;
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
      },
      history: [],
      // TODO: add default builtin startup commands with about, docs, etc.
      // TODO: should unavailable startup commands be shown but disabled or hidden completely?
      startupCommands: ["ps_menu_1030", "ps_menu_15204", "ps_menu_101"],
    };
  }

  /**
   * Load the user data file.
   * @returns {Object}
   */
  async load() {
    // https://developer.adobe.com/xd/uxp/develop/reference/uxp/module/storage/

    const dataFolder = await fs.getDataFolder();
    console.log("loading user data:", dataFolder.nativePath);

    // reset current data
    this.data = {};

    let f = this.file;

    // if file property is undefined, create the an entry
    if (f === undefined) {
      try {
        f = await dataFolder.createEntry(this.fileName, {
          type: storage.types.file,
          overwrite: true,
        });
        this.file = f;
      } catch (error) {
        console.log("error creating user file entry");
        console.log(error);
        console.log("using default data");
        this.data = this.defaultData();
        return this.data;
      }
    }

    // check to see if the file exist on disk
    try {
      f = await dataFolder.getEntry(this.fileName);
    } catch (error) {
      console.log("error getting user data file entry");
      console.log(error);
      console.log("using default user data");
      this.data = this.defaultData;
      return this.data;
    }

    // try to read the file data
    try {
      const fileData = await f.read({ format: storage.formats.utf8 });
      this.data = JSON.parse(fileData);
      console.log("user data file loaded:", this.data);
      this.data;
    } catch (error) {
      console.log("error reading user data file");
      console.log(error);
      console.log("using default user data");
      this.data = this.defaultData;

      // backup user data file for inspection
      const backupFilePath = await this.backup();

      if (backupFilePath != null) {
        // TODO: add custom dialog
        await alertDialog(
          "User Data Error",
          null,
          "There was an error reading your user data file. A backup was created at the following location.\n" +
            backupFilePath
        );
      }

      return this.data;
    }
  }

  /**
   * Write user data to disk.
   * @returns {storage.<File>}
   */
  async write() {
    const dataFolder = await fs.getDataFolder();
    console.log("writing user data:", dataFolder.nativePath);

    let f = this.file;

    // if file property is undefined, create the an entry
    if (f === undefined) {
      try {
        f = await dataFolder.createEntry(this.fileName, {
          type: storage.types.file,
          overwrite: true,
        });
        this.file = f;
      } catch (error) {
        console.log("error creating user file entry");
        console.log(error);

        // TODO: add custom dialog
        await alertDialog(
          "User Data Error",
          null,
          "There was an error creating your user data file."
        );
        return f;
      }
    }

    // write the user data to the file
    try {
      const data = JSON.stringify(this.data);
      await f.write(data, { append: false });
    } catch (error) {
      console.log("error writing user data file");
      console.log(error);
      // TODO: add custom dialog
      await alertDialog(
        "User Data Error",
        null,
        "There was an error writing your user data file."
      );
      return f;
    }
  }

  /**
   * Backup the user data file.
   * @returns {string|null} File path of the backup file.
   */
  async backup() {
    const dataFolder = await fs.getDataFolder();
    console.log("backing up user data:");

    let f = this.file;
    let backupFile;

    // check if file entry is set
    if (f === undefined) {
      return null;
    }

    try {
      await dataFolder.renameEntry(f, f.name + ".bak");
      console.log("user data file backed up to:", f.nativePath);
    } catch (error) {
      console.log("error creating user data backup file");
      console.log(error);
      await alertDialog(
        "User Data Error",
        null,
        "There was an error backing up your user data file."
      );
    }

    return f.nativePath;
  }
}

module.exports = {
  User: User,
};
