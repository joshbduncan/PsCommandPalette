import * as uxp from "uxp";
import * as os from "os";
import * as manifest from "../manifest.json";

export const PLUGIN_AUTHOR = manifest.author;

export type HostInfo = {
    pluginName: string;
    pluginVersion: string;
    hostName: string;
    hostVersion: string;
    hostLocale: string;
    hostOS: string;
};

/**
 * Resolved plugin/host identity, computed once at module load.
 */
export const host: HostInfo = {
    pluginName: manifest.name,
    pluginVersion: manifest.version,
    hostName: uxp.host.name,
    hostVersion: uxp.host.version,
    hostLocale: uxp.host.uiLocale,
    hostOS: os.platform(),
};
