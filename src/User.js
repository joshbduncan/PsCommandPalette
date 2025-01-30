const { storage } = require("uxp");
const fs = storage.localFileSystem;
const { alertDialog } = require("./dialogs/alert.js");

/**
 * Ps Command Palette User Data.
 */
class User {
  /**
   * Create a UserData object.
   */
  constructor() {
    this.data = {};
    this.fileName = "userData.json";
    this.file;
  }

  get defaultData() {
    // FIXME: temp user data for testing
    return {
      plugin: {
        name: PLUGIN_NAME,
        version: PLUGIN_VERSION,
      },
      history: [],
      startupCommands: ["ps_menu_1030", "ps_menu_15204", "ps_menu_101"],
    };
  }

  async load() {
    // https://developer.adobe.com/xd/uxp/develop/reference/uxp/module/storage/

    const dataFolder = await fs.getDataFolder();
    console.log("loading user data:", dataFolder.nativePath);

    // reset current data
    this.data = {};

    let f;
    try {
      f = await dataFolder.getEntry(this.fileName);
      this.file = f;
    } catch (error) {
      console.log(error);
      console.log("using default user data");
      this.data = this.defaultData;
      return;
    }

    try {
      const fileData = await f.read({ format: storage.formats.utf8 });
      this.data = JSON.parse(fileData);
      console.log("user data file loaded:", this.data);
    } catch (error) {
      this.data = this.defaultData;
      console.log(error);
      // TODO: add custom dialog that offers to open the path
      await alertDialog(
        "User Data Error",
        null,
        "There was an error reading your user data file."
      );
      return;
    }
  }

  async write() {
    const dataFolder = await fs.getDataFolder();
    console.log("writing user data:", dataFolder.nativePath);

    let f = this.file;

    try {
      if (f === undefined) {
        f = await dataFolder.createEntry(this.fileName, {
          type: storage.types.file,
          overwrite: true,
        });
      }
      const fileData = JSON.stringify(this.data);
      await f.write(fileData, { append: false });
    } catch (error) {
      console.log(error);
      // TODO: add custom dialog that offers to open the path
      await alertDialog(
        "User Data Error",
        null,
        "There was an error writing your user data file."
      );
      return;
    }
  }
}

module.exports = {
  User: User,
};
