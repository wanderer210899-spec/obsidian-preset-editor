/**
 * Document module: the open preset's prompts and main order, held in memory,
 * with the edits the editor can make (SRS E-2 to E-6). It has no Obsidian
 * or UI code. Saving is done elsewhere from `content`.
 */
import type { OrderEntry, PresetContent, PromptData } from '../preset';

/** One prompt as the editor shows it: in order, with its on/off state. */
export interface Row {
	id: string;
	prompt: Readonly<PromptData>;
	enabled: boolean;
}

/** 'edit': changed in the editor. 'load': replaced by `load()`. */
export type ChangeCause = 'edit' | 'load';

interface Removed {
	prompt: PromptData;
	promptIndex: number;
	entry: OrderEntry;
	orderIndex: number;
}

export class PresetDocument {
	private prompts: PromptData[];
	private order: OrderEntry[];
	private removed: Removed[] = [];
	private listeners = new Set<(cause: ChangeCause) => void>();

	constructor(content: PresetContent) {
		this.prompts = content.prompts.slice();
		this.order = content.order.slice();
	}

	/** Replaces everything with `content` (e.g. the file changed on disk). Clears undo. */
	load(content: PresetContent): void {
		this.prompts = content.prompts.slice();
		this.order = content.order.slice();
		this.removed = [];
		this.changed('load');
	}

	/** The current prompts and main order, ready to be written to the file. */
	get content(): PresetContent {
		return { prompts: this.prompts, order: this.order };
	}

	/**
	 * Every prompt in the main order (E-1). Order entries whose prompt is
	 * missing are skipped, as SillyTavern does.
	 */
	rows(): Row[] {
		const rows: Row[] = [];
		for (const entry of this.order) {
			const prompt = this.find(entry.identifier);
			if (prompt) rows.push({ id: entry.identifier, prompt, enabled: entry.enabled === true });
		}
		return rows;
	}

	/** Calls `listener` after every change. Returns a function that stops it. */
	onChange(listener: (cause: ChangeCause) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** E-3 */
	setEnabled(id: string, enabled: boolean): void {
		const i = this.order.findIndex((e) => e.identifier === id);
		const entry = this.order[i];
		if (!entry) return;
		this.order[i] = { ...entry, enabled };
		this.changed();
	}

	/** E-5: changes some of a prompt's fields. Other fields stay as they are. */
	update(id: string, patch: Partial<PromptData>): void {
		const i = this.prompts.findIndex((p) => p.identifier === id);
		const prompt = this.prompts[i];
		if (!prompt) return;
		this.prompts[i] = { ...prompt, ...patch, identifier: prompt.identifier };
		this.changed();
	}

	/** E-2: moves a prompt to position `to` in `rows()`. */
	move(id: string, to: number): void {
		const from = this.order.findIndex((e) => e.identifier === id);
		const entry = this.order[from];
		if (!entry) return;
		this.order.splice(from, 1);
		this.order.splice(this.orderIndexOfRow(to), 0, entry);
		this.changed();
	}

	/**
	 * E-4: adds a new custom prompt at position `at` in `rows()` (the end if
	 * `at` is past the last row). Returns its identifier.
	 */
	insert(at: number): string {
		const identifier = crypto.randomUUID();
		// Same fields, in the same order, as a prompt created in SillyTavern.
		this.prompts.push({
			identifier,
			system_prompt: false,
			enabled: false,
			marker: false,
			name: 'Untitled prompt',
			role: 'system',
			content: '',
			injection_position: 0,
			injection_depth: 4,
			injection_order: 100,
			injection_trigger: [],
			forbid_overrides: false,
		});
		this.order.splice(this.orderIndexOfRow(at), 0, { identifier, enabled: true });
		this.changed();
		return identifier;
	}

	/** E-4, E-6: deletes a prompt at once. `undo()` brings it back. */
	remove(id: string): void {
		const promptIndex = this.prompts.findIndex((p) => p.identifier === id);
		const orderIndex = this.order.findIndex((e) => e.identifier === id);
		const prompt = this.prompts[promptIndex];
		const entry = this.order[orderIndex];
		if (!prompt || !entry) return;
		this.prompts.splice(promptIndex, 1);
		this.order.splice(orderIndex, 1);
		this.removed.push({ prompt, promptIndex, entry, orderIndex });
		this.changed();
	}

	/** E-6: brings back the last deleted prompt. Returns false if there is none. */
	undo(): boolean {
		const last = this.removed.pop();
		if (!last) return false;
		this.prompts.splice(Math.min(last.promptIndex, this.prompts.length), 0, last.prompt);
		this.order.splice(Math.min(last.orderIndex, this.order.length), 0, last.entry);
		this.changed();
		return true;
	}

	private find(id: string): PromptData | undefined {
		return this.prompts.find((p) => p.identifier === id);
	}

	/** Where in `order` the row at position `row` sits (order.length if past the end). */
	private orderIndexOfRow(row: number): number {
		let seen = 0;
		for (let i = 0; i < this.order.length; i++) {
			const entry = this.order[i];
			if (!entry || !this.find(entry.identifier)) continue;
			if (seen === row) return i;
			seen++;
		}
		return this.order.length;
	}

	private changed(cause: ChangeCause = 'edit'): void {
		for (const listener of this.listeners) listener(cause);
	}
}
