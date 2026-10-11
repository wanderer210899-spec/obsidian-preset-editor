/** What the plugin saves in its data.json. */
interface SettingsData {
	presetFolders: string[];
	/** W-5: close tags while typing. Starts on. */
	autoComplete: boolean;
}

/**
 * Holds the plugin settings (SRS F-1, W-5). Loading and saving are passed in,
 * so this file has no Obsidian code.
 */
export class SettingsStore {
	private data: SettingsData = { presetFolders: [], autoComplete: true };
	private readonly listeners = new Set<() => void>();

	constructor(
		private readonly load: () => Promise<unknown>,
		private readonly save: (data: SettingsData) => Promise<void>,
	) {}

	async init(): Promise<void> {
		const saved = (await this.load()) as Partial<SettingsData> | null;
		const folders = saved?.presetFolders;
		this.data.presetFolders = Array.isArray(folders) ? folders.filter((f) => typeof f === 'string') : [];
		this.data.autoComplete = saved?.autoComplete !== false;
	}

	/** Calls `listener` after any setting changes. Returns a function that stops it. */
	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	private async changed(): Promise<void> {
		await this.save(this.data);
		for (const l of this.listeners) l();
	}

	get presetFolders(): readonly string[] {
		return this.data.presetFolders;
	}

	async addPresetFolder(path: string): Promise<void> {
		if (this.data.presetFolders.includes(path)) return;
		this.data.presetFolders.push(path);
		await this.changed();
	}

	async removePresetFolder(path: string): Promise<void> {
		this.data.presetFolders = this.data.presetFolders.filter((f) => f !== path);
		await this.changed();
	}

	get autoComplete(): boolean {
		return this.data.autoComplete;
	}

	async setAutoComplete(on: boolean): Promise<void> {
		this.data.autoComplete = on;
		await this.changed();
	}
}
