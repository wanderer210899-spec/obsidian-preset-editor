import Sortable from 'sortablejs';

/** Moves the element into `target` (e.g. the Obsidian view header) while it exists. */
export function portal(node: HTMLElement, target: HTMLElement) {
	target.prepend(node);
	return {
		destroy() {
			node.remove();
		},
	};
}

export interface SortableOptions {
	handle: string;
	onMove: (id: string, to: number) => void;
	/**
	 * M-3: the other prompts that move with `id` in a group drag, or null for a
	 * normal drag. They're hidden while dragging.
	 */
	groupOf?: (id: string) => string[] | null;
	onGroupStart?: (id: string, others: string[]) => void;
	/** M-3: a group drag ended at position `to` among the rows not in the group. */
	onGroupEnd?: (to: number) => void;
	/** E-8: no dragging while the list is filtered. */
	disabled?: boolean;
}

/**
 * Drag to reorder with SortableJS (SRS E-2, M-3). Children to drag carry
 * `data-row="<id>"`. Sortable's own DOM move is undone so Svelte stays in
 * charge of the list; the new position is reported through `onMove` or
 * `onGroupEnd`.
 */
export function sortable(node: HTMLElement, options: SortableOptions) {
	let current = options;
	let drag: { id: string; from: number; hidden: HTMLElement[] | null } | null = null;
	// The floating copy Sortable adds while dragging has `data-row` too; it's left out.
	const rowsOf = () => Array.from(node.querySelectorAll<HTMLElement>(':scope > [data-row]:not(.pe-drag-clone)'));
	/** Puts the dragged row back where it started. */
	const putBack = (item: HTMLElement, from: number) => {
		item.remove();
		node.insertBefore(item, rowsOf()[from] ?? null);
	};
	const instance = Sortable.create(node, {
		handle: current.handle,
		disabled: current.disabled ?? false,
		draggable: '[data-row]',
		animation: 150,
		forceFallback: true,
		fallbackClass: 'pe-drag-clone',
		ghostClass: 'pe-lifted',
		onStart(e) {
			const id = e.item.dataset.row ?? '';
			const others = current.groupOf?.(id) ?? null;
			// Sortable skips rows hidden with an inline style.
			const hidden = others && rowsOf().filter((el) => others.includes(el.dataset.row ?? ''));
			for (const el of hidden ?? []) el.style.display = 'none';
			drag = { id, from: rowsOf().indexOf(e.item), hidden };
			if (others) current.onGroupStart?.(id, others);
		},
		onEnd(e) {
			const started = drag;
			drag = null;
			if (!started) return;
			if (started.hidden) {
				const rows = rowsOf();
				const to = rows.slice(0, rows.indexOf(e.item)).filter((el) => el.style.display !== 'none').length;
				putBack(e.item, started.from);
				for (const el of started.hidden) el.style.display = '';
				current.onGroupEnd?.(to);
				return;
			}
			const from = e.oldDraggableIndex;
			const to = e.newDraggableIndex;
			if (from === undefined || to === undefined || from === to) return;
			putBack(e.item, started.from);
			current.onMove(started.id, to);
		},
	});
	return {
		update(next: SortableOptions) {
			current = next;
			instance.option('disabled', next.disabled ?? false);
		},
		destroy() {
			instance.destroy();
		},
	};
}
