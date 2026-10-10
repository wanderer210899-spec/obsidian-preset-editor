/**
 * Autosave module (SRS S-1): writes changes a short time after the last one.
 * What "write" means is passed in, so this file has no Obsidian code.
 */

export type SaveStatus = 'saved' | 'saving' | 'error';

const DELAY_MS = 500;

export class Autosave {
	private timer: ReturnType<typeof setTimeout> | null = null;
	private running: Promise<void> = Promise.resolve();
	private status: SaveStatus = 'saved';

	constructor(
		private readonly write: () => Promise<void>,
		private readonly onStatus: (status: SaveStatus) => void,
	) {}

	/** Call after every change. */
	schedule(): void {
		this.setStatus('saving');
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(() => void this.flush(), DELAY_MS);
	}

	/** Drops a change that is waiting to be written. */
	cancel(): void {
		if (!this.timer) return;
		clearTimeout(this.timer);
		this.timer = null;
		this.setStatus('saved');
	}

	/** Writes now if a change is waiting. Call before the editor closes. */
	async flush(): Promise<void> {
		if (!this.timer) return this.running;
		clearTimeout(this.timer);
		this.timer = null;
		this.running = this.running.then(async () => {
			try {
				await this.write();
				if (!this.timer) this.setStatus('saved');
			} catch (e) {
				console.error('Preset Editor: save failed', e);
				this.setStatus('error');
			}
		});
		return this.running;
	}

	private setStatus(status: SaveStatus): void {
		if (status === this.status) return;
		this.status = status;
		this.onStatus(status);
	}
}
