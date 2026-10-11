<script lang="ts">
	interface Props {
		width: string;
		height: string;
	}
	let { width, height }: Props = $props();
</script>

<!-- Drag handle in the Order panel; SortableJS finds it by the `pe-grip` class. Mockup default style: lines (SRS I-3). -->
<div class="pe-grip" title="Drag to reorder" style:width style:height>
	<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
		<path d="M3 5.5h8M3 8.5h8"></path>
	</svg>
</div>

<style>
	.pe-grip {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-faint);
		cursor: grab;
		touch-action: none;
		user-select: none;
	}
	.pe-grip:hover {
		color: var(--text-muted);
	}
</style>
