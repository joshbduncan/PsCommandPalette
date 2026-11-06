/** A single entry in a plain command registry (plugin/API commands). */
export type CommandRegistryEntry = {
    name: string;
    description: string;
    callback: () => unknown;
    /** See `Command.destructive` - shows a confirm dialog before `callback` runs. */
    destructive?: boolean;
};

export type CommandRegistry = Record<string, CommandRegistryEntry>;

/**
 * Merge command registries into one, throwing on duplicate keys instead of
 * silently letting a later registry overwrite an earlier one's command.
 */
export function mergeRegistries(...registries: CommandRegistry[]): CommandRegistry {
    const merged: CommandRegistry = {};
    for (const registry of registries) {
        for (const key of Object.keys(registry)) {
            if (key in merged) {
                throw new Error(`Duplicate command registry key: "${key}"`);
            }
            merged[key] = registry[key];
        }
    }
    return merged;
}
