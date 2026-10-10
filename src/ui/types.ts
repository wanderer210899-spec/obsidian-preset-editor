import type { PromptData } from '../preset';

/** One prompt as shown in the editor. */
export interface UiRow {
	id: string;
	prompt: Readonly<PromptData>;
	enabled: boolean;
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
}

export type SaveState = 'saved' | 'saving' | 'error';

export type Mode = 'edit' | 'preview';
export type Engine = 'new' | 'legacy';
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
