import { _channel } from "./channel";
import { _channels } from "./channels";
import { _document } from "./document";
import { _guides } from "./guides";
import { _layer } from "./layer";
import { mergeRegistries, type CommandRegistry } from "../registry";

export const apiCommands: CommandRegistry = mergeRegistries(
    _channel,
    _channels,
    _document,
    _guides,
    _layer
);
