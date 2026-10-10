/**
 * One entry in the preset's `prompts` list. Field names follow SillyTavern
 * (public/scripts/PromptManager.js, class Prompt). Unknown fields are kept
 * as they are so nothing is lost on save.
 */
export interface PromptData {
	identifier: string;
	name?: string;
	role?: string;
	content?: string;
	system_prompt?: boolean;
	marker?: boolean;
	injection_position?: number;
	injection_depth?: number;
	injection_order?: number;
	injection_trigger?: string[];
	forbid_overrides?: boolean;
	[key: string]: unknown;
}

/** One entry in a `prompt_order` list: which prompt, and whether it is on. */
export interface OrderEntry {
	identifier: string;
	enabled?: boolean;
	[key: string]: unknown;
}

/** The parts of a preset the plugin edits (SRS S-2). */
export interface PresetContent {
	prompts: PromptData[];
	/** The main prompt order (`character_id` 100001). */
	order: OrderEntry[];
}
