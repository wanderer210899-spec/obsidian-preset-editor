/** Moves the element into `target` (e.g. the page body) while it exists. */
export function portal(node: HTMLElement, target: HTMLElement) {
	target.appendChild(node);
	return {
		destroy() {
			node.remove();
		},
	};
}

/** Puts the element first in Obsidian's view header actions while it exists. */
export function headerSlot(node: HTMLElement, header: HTMLElement) {
	header.prepend(node);
	return {
		destroy() {
			node.remove();
		},
	};
}

/** Focuses a text box, selects its text, and scrolls it into view. */
export function focusSelect(node: HTMLInputElement) {
	node.focus();
	node.select();
	node.scrollIntoView({ block: 'nearest' });
}

/**
 * Makes a `role="button"` element work with Enter and Space. The library uses
 * these instead of <button>, as the editor does, so Obsidian's button look
 * (padding, background) never applies.
 */
export function pressable(node: HTMLElement) {
	const key = (e: KeyboardEvent) => {
		if (e.target !== node || (e.key !== 'Enter' && e.key !== ' ')) return;
		e.preventDefault();
		node.click();
	};
	node.addEventListener('keydown', key);
	return {
		destroy() {
			node.removeEventListener('keydown', key);
		},
	};
}
