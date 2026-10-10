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

/** One step of the undo timeline: how things were, and which prompt changed. */
interface Step {
	prompts: PromptData[];
	order: OrderEntry[];
	id: string;
}

/** E-6: the timeline keeps this many steps. */
const MAX_STEPS = 200;
/** E-6: typing in the same field with shorter pauses than this undoes as one step. */
const GROUP_MS = 500;

export class PresetDocument {
	private prompts: PromptData[];
	private order: OrderEntry[];
	private undoSteps: Step[] = [];
	private redoSteps: Step[] = [];
	/** The field last typed in, and when, to group typing into one step. */
	private typing: { key: string; at: number } | null = null;
	private listeners = new Set<(cause: ChangeCause) => void>();

	/** `now` gives the time in ms; tests pass their own clock. */
	constructor(
		content: PresetContent,
		private readonly now: () => number = Date.now,
	) {
		this.prompts = content.prompts.slice();
		this.order = content.order.slice();
	}

	/** Replaces everything with `content` (e.g. the file changed on disk). Clears undo and redo. */
	load(content: PresetContent): void {
		this.prompts = content.prompts.slice();
		this.order = content.order.slice();
		this.undoSteps = [];
		this.redoSteps = [];
		this.typing = null;
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

	/** E-3. Not part of the undo timeline (E-6). */
	setEnabled(id: string, enabled: boolean): void {
		const i = this.order.findIndex((e) => e.identifier === id);
		const entry = this.order[i];
		if (!entry) return;
		this.order[i] = { ...entry, enabled };
		this.changed();
	}

	/**
	 * E-5: changes some of a prompt's fields. Other fields stay as they are.
	 * Quick repeated changes to the same fields undo as one step (typing).
	 */
	update(id: string, patch: Partial<PromptData>): void {
		const i = this.prompts.findIndex((p) => p.identifier === id);
		const prompt = this.prompts[i];
		if (!prompt) return;
		const keys = (Object.keys(patch) as (keyof PromptData)[]).filter((k) => k !== 'identifier');
		if (keys.every((k) => Object.is(prompt[k], patch[k]))) return;
		const key = id + '\n' + keys.sort().join(',');
		const now = this.now();
		const sameTyping = this.typing?.key === key && now - this.typing.at < GROUP_MS;
		if (!sameTyping) this.record(id);
		this.typing = { key, at: now };
		this.prompts[i] = { ...prompt, ...patch, identifier: prompt.identifier };
		this.changed();
	}

	/** E-2: moves a prompt to position `to` in `rows()`. */
	move(id: string, to: number): void {
		const from = this.order.findIndex((e) => e.identifier === id);
		const entry = this.order[from];
		if (!entry) return;
		this.record(id);
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
		this.record(identifier);
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
		if (promptIndex < 0 || orderIndex < 0) return;
		this.record(id);
		this.prompts.splice(promptIndex, 1);
		this.order.splice(orderIndex, 1);
		this.changed();
	}

	/** E-6 */
	canUndo(): boolean {
		return this.undoSteps.length > 0;
	}

	/** E-6 */
	canRedo(): boolean {
		return this.redoSteps.length > 0;
	}

	/**
	 * E-6: goes back one step on the timeline. Returns the prompt that step
	 * changed, or null if there is nothing to undo.
	 */
	undo(): string | null {
		return this.travel(this.undoSteps, this.redoSteps);
	}

	/** E-6: goes forward again after `undo()`. Returns the prompt it changed, or null. */
	redo(): string | null {
		return this.travel(this.redoSteps, this.undoSteps);
	}

	/** Saves how things are now as an undo step, before a change to prompt `id`. A new change clears redo. */
	private record(id: string): void {
		this.undoSteps.push(this.snapshot(id));
		if (this.undoSteps.length > MAX_STEPS) this.undoSteps.shift();
		this.redoSteps = [];
		this.typing = null;
	}

	private snapshot(id: string): Step {
		return { prompts: this.prompts.slice(), order: this.order.slice(), id };
	}

	/** Moves one step from `from` to `to`. On/off states stay as they are now (E-6). */
	private travel(from: Step[], to: Step[]): string | null {
		const step = from.pop();
		if (!step) return null;
		to.push(this.snapshot(step.id));
		const enabled = new Map(this.order.map((e) => [e.identifier, e.enabled]));
		this.prompts = step.prompts.slice();
		this.order = step.order.map((e) => {
			if (!enabled.has(e.identifier)) return e;
			const on = enabled.get(e.identifier);
			return on === e.enabled ? e : { ...e, enabled: on };
		});
		this.typing = null;
		this.changed();
		return step.id;
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
