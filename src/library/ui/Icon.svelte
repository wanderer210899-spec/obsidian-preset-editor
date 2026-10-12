<script lang="ts">
	/** The line icons used in the B2 mockups. */
	type Name = 'chevron-down' | 'chevron-right' | 'folder' | 'file' | 'search' | 'x' | 'plus' | 'more' | 'check' | 'move' | 'trash';
	interface Props {
		name: Name;
		size?: number;
		stroke?: number;
	}
	let { name, size = 16, stroke = 1.8 }: Props = $props();
</script>

{#if name === 'more'}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="19" cy="12" r="1.8"></circle></svg>
{:else}
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		{#if name === 'chevron-down'}<path d="M6 9l6 6 6-6"></path>
		{:else if name === 'chevron-right'}<path d="M9 6l6 6-6 6"></path>
		{:else if name === 'folder'}<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
		{:else if name === 'file'}<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"></path><path d="M14 3v5h5"></path>
		{:else if name === 'search'}<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path>
		{:else if name === 'x'}<path d="M18 6 6 18M6 6l12 12"></path>
		{:else if name === 'plus'}<path d="M12 5v14M5 12h14"></path>
		{:else if name === 'check'}<path d="M6 12l4 4 8-9"></path>
		{:else if name === 'move'}<path d="M4 12h14M13 6l6 6-6 6"></path>
		{:else if name === 'trash'}<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
		{/if}
	</svg>
{/if}
