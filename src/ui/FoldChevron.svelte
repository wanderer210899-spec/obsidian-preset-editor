<script lang="ts">
	interface Props {
		open: boolean;
		width: string;
		height: string;
		onclick: () => void;
	}
	let { open, width, height, onclick }: Props = $props();
</script>

<!-- C-1: opens or folds a prompt. Takes the place of the drag handle (E-2). -->
<button
	type="button"
	class="chev"
	aria-label={open ? 'Hide prompt text' : 'Show prompt text'}
	aria-expanded={open}
	style:width
	style:height
	{onclick}
>
	<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style:transform="rotate({open ? '0deg' : '-90deg'})"><path d="m6 9 6 6 6-6"></path></svg>
</button>

<style>
	.chev,
	.chev:hover {
		flex: none;
		margin-left: -6px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 0;
		border-radius: 5px;
		background: transparent;
		box-shadow: none;
		color: var(--text-muted);
		cursor: pointer;
	}
	.chev:hover {
		background: var(--background-modifier-hover);
		color: var(--text-normal);
	}
	svg {
		transition: transform 0.15s;
	}
</style>
