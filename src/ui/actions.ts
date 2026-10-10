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
}

/**
 * Drag to reorder with SortableJS (SRS E-2). Children to drag carry
 * `data-row="<id>"`. Sortable's own DOM move is undone so Svelte stays in
 * charge of the list; the new position is reported through `onMove`.
 */
export function sortable(node: HTMLElement, options: SortableOptions) {
	let current = options;
	const instance = Sortable.create(node, {
		handle: current.handle,
		draggable: '[data-row]',
		animation: 150,
		forceFallback: true,
		fallbackClass: 'pe-drag-clone',
		ghostClass: 'pe-lifted',
		onEnd(e) {
			const from = e.oldDraggableIndex;
			const to = e.newDraggableIndex;
			if (from === undefined || to === undefined || from === to) return;
			e.item.remove();
			node.insertBefore(e.item, node.querySelectorAll(':scope > [data-row]')[from] ?? null);
			const id = e.item.dataset.row;
			if (id) current.onMove(id, to);
		},
	});
	return {
		update(next: SortableOptions) {
			current = next;
		},
		destroy() {
			instance.destroy();
		},
	};
}
