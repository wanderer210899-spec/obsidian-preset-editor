<script lang="ts">
	import Segmented from './Segmented.svelte';
	import type { Engine, Sizes } from './types';

	interface Props {
		sizes: Sizes;
		engine: Engine;
		onpickengine: (engine: Engine) => void;
	}
	let { sizes, engine, onpickengine }: Props = $props();
</script>

<!-- Preview screen shell (SRS 3.4). The assembled prompt arrives in 1.1+; what 1.0 shows is open item 5. -->
<div class="pane" class:narrow={sizes.narrow}>
	{#if sizes.narrow}
		<div class="engine">
			<span>Macro engine</span>
			<Segmented
				options={[
					{ value: 'new' as Engine, label: 'New' },
					{ value: 'legacy' as Engine, label: 'Legacy' },
				]}
				value={engine}
				onpick={onpickengine}
				height="32px"
				fontSize="13px"
				padX="14px"
			/>
		</div>
	{/if}
</div>

<style>
	.pane {
		max-width: 780px;
		margin: 0 auto;
		padding: 24px 48px 120px;
	}
	.pane.narrow {
		padding: 18px 16px 120px;
	}
	.engine {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 14px;
	}
	.engine span {
		flex: 1;
		font-size: 14px;
		color: var(--text-muted);
	}
</style>
