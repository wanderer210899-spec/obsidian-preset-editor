import { type App, SuggestModal } from 'obsidian';
import type { FolderChoice } from './catalog';

/** L-3, L-6: "New preset in…" from the command palette. */
export class FolderPickModal extends SuggestModal<FolderChoice> {
	constructor(
		app: App,
		private readonly choices: FolderChoice[],
		private readonly onPick: (folder: string) => void,
	) {
		super(app);
		this.setPlaceholder('New preset in…');
	}

	getSuggestions(query: string): FolderChoice[] {
		const q = query.trim().toLowerCase();
		return q ? this.choices.filter((c) => c.path.toLowerCase().includes(q)) : this.choices;
	}

	renderSuggestion(choice: FolderChoice, el: HTMLElement): void {
		el.setText(choice.path);
	}

	onChooseSuggestion(choice: FolderChoice): void {
		this.onPick(choice.path);
	}
}
