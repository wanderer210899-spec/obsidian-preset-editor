/**
 * Preset module: reads and writes the SillyTavern preset file format.
 * Pure text in, text out. No Obsidian or UI code.
 */
export type { OrderEntry, PresetContent, PromptData } from './types';
export { readPreset } from './read';
export { writePreset } from './write';
