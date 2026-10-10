import type { OrderEntry, PresetContent, PromptData } from './types';

/** SillyTavern's id for the main prompt order (openai.js, promptOrder.dummyId). */
export const MAIN_ORDER_ID = 100001;

/**
 * Reads a preset's prompts and main prompt order from file text.
 * Returns null when the text is not a valid preset (SRS F-3).
 */
export function readPreset(text: string): PresetContent | null {
	let data: unknown;
	try {
		data = JSON.parse(text.replace(/^﻿/, ''));
	} catch {
		return null;
	}
	if (!isObject(data) || !Array.isArray(data.prompts) || !Array.isArray(data.prompt_order)) return null;
	if (!data.prompts.every(isPromptData)) return null;

	// SillyTavern takes the first list whose id matches (PromptManager.getPromptOrderForCharacter).
	const main = data.prompt_order.find(
		(list: unknown) => isObject(list) && String(list.character_id) === String(MAIN_ORDER_ID),
	) as Record<string, unknown> | undefined;
	if (!main || !Array.isArray(main.order) || !main.order.every(isOrderEntry)) return null;

	return { prompts: data.prompts, order: main.order };
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPromptData(value: unknown): value is PromptData {
	return isObject(value) && typeof value.identifier === 'string';
}

function isOrderEntry(value: unknown): value is OrderEntry {
	return isObject(value) && typeof value.identifier === 'string';
}
