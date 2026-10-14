<script lang="ts">
	interface Props {
		width: string;
		height: string;
		/** E-8: dragging is off while the Order panel list is filtered. */
		off?: boolean;
	}
	let { width, height, off = false }: Props = $props();
</script>

<!-- Drag handle in the Order panel; SortableJS finds it by the `pe-grip` class. Mockup default style: lines (SRS I-3). -->
<div class="pe-grip" class:off title={off ? undefined : 'Drag to reorder'} style:width style:height>
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
	.pe-grip.off {
		opacity: 0.35;
		cursor: default;
	}
	.pe-grip.off:hover {
		color: var(--text-faint);
	}
</style>
