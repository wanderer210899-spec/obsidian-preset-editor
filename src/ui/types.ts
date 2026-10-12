import type { PromptData } from '../preset';

/** One prompt as shown in the editor. */
export interface UiRow {
	id: string;
	prompt: Readonly<PromptData>;
	enabled: boolean;
}

/** A prompt to send to another preset, with its on/off state (M-1). */
export interface IncomingPrompt {
	prompt: Readonly<PromptData>;
	enabled: boolean;
}

/** M-6: work in another preset that Undo and Redo of a step must follow. */
export interface StepLink {
	undo(): void;
	redo(): void;
}

/** What the UI needs from the open preset. Positions are indexes into `rows()`. */
export interface EditorDocument {
	rows(): UiRow[];
	onChange(listener: () => void): () => void;
	setEnabled(id: string, enabled: boolean): void;
	update(id: string, patch: Partial<PromptData>): void;
	move(id: string, to: number): void;
	insert(at: number): string;
	remove(id: string): void;
	/** M-3: moves the prompts together to position `to` among the other rows. One undo step. */
	moveMany(ids: readonly string[], to: number): void;
	/** M-2, M-6: deletes the prompts as one undo step. */
	removeMany(ids: readonly string[], link?: StepLink): void;
	/** E-6: the undo timeline. `undo` and `redo` return the prompt they changed, or null. */
	canUndo(): boolean;
	canRedo(): boolean;
	undo(): string | null;
	redo(): string | null;
}

/** M-1: a preset to pick in Copy to… and Move to…. */
export interface PresetChoice {
	path: string;
	name: string;
	/** Path of the folder it's in. */
	folder: string;
	prompts: number;
	/** The preset that's open here. It's greyed out. */
	current: boolean;
}

/** M-1: one prompt in the other preset, to pick the spot. */
export interface SpotRow {
	name: string;
	placeholder: boolean;
}

/**
 * M-6: takes added prompts back out of the other preset. Prompts changed there
 * since stay; their names are returned. Null if the preset couldn't be changed.
 */
export type TakeBack = () => Promise<string[] | null>;

/** M-1: the other presets, as the editor needs them. The view gives it. */
export interface PresetPort {
	presets(): Promise<PresetChoice[]>;
	/** The prompts in a preset, in order. Null if it can't be read. */
	rows(path: string): Promise<SpotRow[] | null>;
	/** Adds the prompts at position `at` in that preset. Null if it couldn't be changed. */
	add(path: string, at: number, prompts: IncomingPrompt[]): Promise<TakeBack | null>;
	/** M-7: "Open" opens it in a new tab. */
	open(path: string): void;
}

/** M-7: a message in Obsidian's message box. Lines of text, then links. */
export interface Message {
	lines: string[];
	links: { label: string; run: () => void }[];
}

export interface MessageHandle {
	close(): void;
}

export type Notify = (message: Message) => MessageHandle;

export type SaveState = 'saved' | 'saving' | 'error';

export type Mode = 'edit' | 'preview';
export type Tab = 'order' | 'vars';

/** Sizes that differ between the wide and narrow layouts (from the mockup). */
export interface Sizes {
	narrow: boolean;
	gripW: string;
	gripH: string;
	nameFs: string;
	selFs: string;
	inFs: string;
	monoFs: string;
	btnH: string;
	ctlH: string;
	oRowH: string;
}

export function sizesFor(narrow: boolean): Sizes {
	return {
		narrow,
		gripW: narrow ? '32px' : '24px',
		gripH: narrow ? '40px' : '28px',
		nameFs: narrow ? '17px' : '15.5px',
		selFs: narrow ? '16px' : '12.5px',
		inFs: narrow ? '16px' : '13px',
		monoFs: narrow ? '16px' : '13px',
		btnH: narrow ? '40px' : '30px',
		ctlH: narrow ? '34px' : '26px',
		oRowH: narrow ? '44px' : '34px',
	};
}
