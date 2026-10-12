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

/**
 * M-6: work done outside this preset that Undo and Redo must follow, e.g.
 * prompts sent to another preset. Runs after the step is undone or redone.
 */
export interface StepLink {
	undo(): void;
	redo(): void;
}

/** A prompt to add, with its on/off state (M-1). */
export interface IncomingPrompt {
	prompt: Readonly<PromptData>;
	enabled: boolean;
}

/** One step of the undo timeline: how things were, and which prompt changed. */
interface Step {
	prompts: PromptData[];
	order: OrderEntry[];
	id: string;
	link?: StepLink;
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

	/** The prompt with this identifier, if the preset has it. */
	prompt(id: string): Readonly<PromptData> | undefined {
		return this.find(id);
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
	 * M-3: moves several prompts so they sit together, in the order they were
	 * in, at position `to` among the other rows. One undo step.
	 */
	moveMany(ids: readonly string[], to: number): void {
		const group = new Set(ids);
		const moving = this.order.filter((e) => group.has(e.identifier) && this.find(e.identifier));
		const first = moving[0];
		if (!first) return;
		const rest = this.order.filter((e) => !moving.includes(e));
		const at = this.orderIndexOfRow(to, rest);
		const next = [...rest.slice(0, at), ...moving, ...rest.slice(at)];
		const shown = (order: OrderEntry[]) => order.filter((e) => this.find(e.identifier));
		const before = shown(this.order);
		if (shown(next).every((e, i) => e === before[i])) return;
		this.record(first.identifier);
		this.order = next;
		this.changed();
	}

	/**
	 * M-1, M-5: adds copies of `incoming` at position `at` in `rows()`, as one
	 * undo step. A prompt whose identifier is already used here gets a new one,
	 * so a second prompt is added and nothing is replaced. Returns the prompts
	 * as they were added.
	 */
	insertMany(at: number, incoming: readonly IncomingPrompt[]): PromptData[] {
		const used = new Set([...this.prompts.map((p) => p.identifier), ...this.order.map((e) => e.identifier)]);
		const added = incoming.map(({ prompt }) => {
			const identifier = used.has(prompt.identifier) ? crypto.randomUUID() : prompt.identifier;
			used.add(identifier);
			return { ...structuredClone(prompt), identifier };
		});
		const first = added[0];
		if (!first) return [];
		this.record(first.identifier);
		this.prompts.push(...added);
		const entries = added.map((p, i) => ({ identifier: p.identifier, enabled: incoming[i]?.enabled === true }));
		this.order.splice(this.orderIndexOfRow(at), 0, ...entries);
		this.changed();
		return added.map((p) => structuredClone(p));
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

	/**
	 * M-2, M-6: deletes several prompts as one undo step. `link` runs when the
	 * step is undone or redone.
	 */
	removeMany(ids: readonly string[], link?: StepLink): void {
		const wanted = new Set(ids);
		const gone = new Set(this.order.filter((e) => wanted.has(e.identifier) && this.find(e.identifier)).map((e) => e.identifier));
		const first = [...gone][0];
		if (first === undefined) return;
		this.record(first, link);
		this.prompts = this.prompts.filter((p) => !gone.has(p.identifier));
		this.order = this.order.filter((e) => !gone.has(e.identifier));
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
		return this.travel(this.undoSteps, this.redoSteps, 'undo');
	}

	/** E-6: goes forward again after `undo()`. Returns the prompt it changed, or null. */
	redo(): string | null {
		return this.travel(this.redoSteps, this.undoSteps, 'redo');
	}

	/** Saves how things are now as an undo step, before a change to prompt `id`. A new change clears redo. */
	private record(id: string, link?: StepLink): void {
		this.undoSteps.push({ ...this.snapshot(id), link });
		if (this.undoSteps.length > MAX_STEPS) this.undoSteps.shift();
		this.redoSteps = [];
		this.typing = null;
	}

	private snapshot(id: string): Step {
		return { prompts: this.prompts.slice(), order: this.order.slice(), id };
	}

	/** Moves one step from `from` to `to`. On/off states stay as they are now (E-6). */
	private travel(from: Step[], to: Step[], way: 'undo' | 'redo'): string | null {
		const step = from.pop();
		if (!step) return null;
		to.push({ ...this.snapshot(step.id), link: step.link });
		const enabled = new Map(this.order.map((e) => [e.identifier, e.enabled]));
		this.prompts = step.prompts.slice();
		this.order = step.order.map((e) => {
			if (!enabled.has(e.identifier)) return e;
			const on = enabled.get(e.identifier);
			return on === e.enabled ? e : { ...e, enabled: on };
		});
		this.typing = null;
		this.changed();
		step.link?.[way]();
		return step.id;
	}

	private find(id: string): PromptData | undefined {
		return this.prompts.find((p) => p.identifier === id);
	}

	/** Where in `order` the row at position `row` sits (order.length if past the end). */
	private orderIndexOfRow(row: number, order: readonly OrderEntry[] = this.order): number {
		let seen = 0;
		for (let i = 0; i < order.length; i++) {
			const entry = order[i];
			if (!entry || !this.find(entry.identifier)) continue;
			if (seen === row) return i;
			seen++;
		}
		return order.length;
	}

	private changed(cause: ChangeCause = 'edit'): void {
		for (const listener of this.listeners) listener(cause);
	}
}
