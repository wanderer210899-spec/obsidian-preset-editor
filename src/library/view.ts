import { ItemView, Platform, Scope, type WorkspaceLeaf } from 'obsidian';
import { t } from '../i18n';
import type { LibraryActions } from './actions';
import type { LibraryPrefs } from './prefs';
import { PresetsIndex } from './presets-index';
import { type LibraryHandle, mountLibrary } from './ui';

export const LIBRARY_VIEW_TYPE = 'preset-library';

export interface LibraryDeps {
	presetFolders: () => readonly string[];
	/** Calls back after the preset folders change in the settings. */
	onFoldersChange: (listener: () => void) => () => void;
	actions: LibraryActions;
	prefs: LibraryPrefs;
}

/** The library tab (SRS 3.8). */
export class LibraryView extends ItemView {
	private index: PresetsIndex | null = null;
	private ui: LibraryHandle | null = null;
	private stopFolders: (() => void) | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly deps: LibraryDeps,
	) {
		super(leaf);
		this.scope = new Scope(this.app.scope);
		this.scope.register([], 'Escape', () => {
			this.ui?.escape();
			return true;
		});
	}

	getViewType(): string {
		return LIBRARY_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t('library.title');
	}

	getIcon(): string {
		return 'sliders-horizontal';
	}

	/** The "New preset" command while the library is in use. */
	newPreset(): void {
		this.ui?.newPreset();
	}

	async onOpen(): Promise<void> {
		const { actions, prefs } = this.deps;
		const index = new PresetsIndex(this.app, this.deps.presetFolders);
		this.index = index;
		this.stopFolders = this.deps.onFoldersChange(() => void index.rescan());
		await index.start();

		this.contentEl.empty();
		this.contentEl.setCssStyles({ padding: '0', overflow: 'hidden' });
		const header = this.containerEl.querySelector<HTMLElement>('.view-header .view-actions') ?? this.contentEl;
		this.ui = mountLibrary(
			this.contentEl,
			header,
			{
				snapshot: () => index.snapshot(),
				onChange: (l) => index.onChange(l),
				prefs,
				open: (path) => actions.open(path),
				rename: (path, name) => actions.rename(path, name),
				move: (paths, folder) => actions.move(paths, folder),
				remove: (paths) => actions.remove(paths),
				create: (folder) => actions.create(folder),
			},
			Platform.isMobile,
		);
	}

	async onClose(): Promise<void> {
		this.stopFolders?.();
		this.index?.stop();
		this.ui?.destroy();
		this.contentEl.empty();
		this.index = this.ui = this.stopFolders = null;
	}
}
