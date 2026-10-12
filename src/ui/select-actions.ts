/**
 * Select mode actions (SRS 3.7): delete, drag, copy and move the picked
 * prompts, and their messages (M-7). No Svelte or Obsidian code.
 */
import { rulesFor } from '../kinds';
import * as say from './select-messages';
import type { EditorDocument, MessageHandle, Notify, PresetChoice, PresetPort, TakeBack, UiRow } from './types';

const nameOf = (row: UiRow) => row.prompt.name ?? row.id;

export class PickedActions {
	/** M-7: the message that the next change in this preset closes. */
	private closesOnChange: MessageHandle | null = null;

	constructor(
		private readonly doc: EditorDocument,
		private readonly port: PresetPort,
		private readonly notify: Notify,
		/** E-6: Undo, showing the prompt it changed. */
		private readonly undo: () => void,
	) {}

	/** M-7: call after every change in this preset. */
	changed(): void {
		this.closesOnChange?.close();
		this.closesOnChange = null;
	}

	/** M-4: the picked prompts, in list order, split into those that can go and those that stay. */
	split(ids: Iterable<string>): { go: UiRow[]; locked: UiRow[] } {
		const picked = new Set(ids);
		const rows = this.doc.rows().filter((r) => picked.has(r.id));
		return { go: rows.filter((r) => rulesFor(r.id).remove), locked: rows.filter((r) => !rulesFor(r.id).remove) };
	}

	/** M-4: true if some picked prompts can go. If none can, says why. */
	canSend(ids: Iterable<string>): boolean {
		const { go, locked } = this.split(ids);
		if (go.length) return true;
		this.notify({ lines: [say.onlyLocked(locked.map(nameOf))], links: [] });
		return false;
	}

	/** M-2: deletes the picked prompts that can be deleted. True if anything was deleted. */
	delete(ids: Iterable<string>): boolean {
		if (!this.canSend(ids)) return false;
		const { go, locked } = this.split(ids);
		this.doc.removeMany(go.map((r) => r.id));
		this.showUndoable([say.deleted(go.map(nameOf)), ...this.skippedLine(locked)]);
		return true;
	}

	/** M-3: moves the picked prompts together to position `to` among the others. True if anything moved. */
	drag(ids: readonly string[], to: number): boolean {
		const before = this.doc.rows().map((r) => r.id).join('\n');
		this.doc.moveMany(ids, to);
		if (this.doc.rows().map((r) => r.id).join('\n') === before) return false;
		this.showUndoable([say.moved(this.namesOf(ids))]);
		return true;
	}

	/** M-1: copies the picked prompts into `target` at position `at`. True once done. */
	async copy(target: PresetChoice, at: number, ids: Iterable<string>): Promise<boolean> {
		const { go, locked } = this.split(ids);
		const takeBack = await this.port.add(target.path, at, go.map((r) => ({ prompt: r.prompt, enabled: r.enabled })));
		if (!takeBack) {
			this.notify({ lines: [say.couldNotAdd(target.name)], links: [] });
			return false;
		}
		// M-6: Copy to… is undone from its message only. A later change here doesn't close it.
		this.notify({
			lines: [say.copiedTo(go.map(nameOf), target.name), ...this.skippedLine(locked)],
			links: [
				{ label: 'Undo', run: () => void this.takeBack(takeBack, target) },
				{ label: 'Open', run: () => this.port.open(target.path) },
			],
		});
		return true;
	}

	/** M-1: moves the picked prompts into `target` at position `at`. True once done. */
	async move(target: PresetChoice, at: number, ids: Iterable<string>): Promise<boolean> {
		const { go, locked } = this.split(ids);
		const prompts = go.map((r) => ({ prompt: r.prompt, enabled: r.enabled }));
		let takeBack = await this.port.add(target.path, at, prompts);
		if (!takeBack) {
			this.notify({ lines: [say.couldNotAdd(target.name)], links: [] });
			return false;
		}
		// M-6: undoing the move also takes the prompts back out of the other preset.
		this.doc.removeMany(
			go.map((r) => r.id),
			{
				undo: () => {
					const done = takeBack;
					takeBack = null;
					if (done) void this.takeBack(done, target);
				},
				redo: () => {
					void this.port.add(target.path, at, prompts).then((next) => {
						takeBack = next;
						if (!next) this.notify({ lines: [say.couldNotAdd(target.name)], links: [] });
					});
				},
			},
		);
		this.showUndoable([say.movedTo(go.map(nameOf), target.name), ...this.skippedLine(locked)], {
			label: 'Open',
			run: () => this.port.open(target.path),
		});
		return true;
	}

	/** M-6: takes added prompts back out of `target`; changed ones stay, and a message names them. */
	private async takeBack(takeBack: TakeBack, target: PresetChoice): Promise<void> {
		const kept = await takeBack();
		if (!kept) this.notify({ lines: [say.couldNotTakeBack(target.name)], links: [] });
		else if (kept.length) this.notify({ lines: [say.changedStays(kept, target.name)], links: [] });
	}

	/** M-7: a message with Undo, closed by the next change in this preset. */
	private showUndoable(lines: string[], extra?: { label: string; run: () => void }): void {
		this.changed();
		this.closesOnChange = this.notify({
			lines,
			links: [{ label: 'Undo', run: () => this.undo() }, ...(extra ? [extra] : [])],
		});
	}

	private skippedLine(locked: UiRow[]): string[] {
		return locked.length ? [say.skipped(locked.map(nameOf))] : [];
	}

	private namesOf(ids: Iterable<string>): string[] {
		const picked = new Set(ids);
		return this.doc.rows().filter((r) => picked.has(r.id)).map(nameOf);
	}
}
