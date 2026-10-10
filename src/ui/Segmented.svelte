<script lang="ts" generics="T">
	interface Option {
		value: T;
		label: string;
		count?: string | number;
	}
	interface Props {
		options: Option[];
		value: T;
		onpick: (value: T) => void;
		fill?: boolean;
		height?: string;
		fontSize?: string;
		padX?: string;
		radius?: string;
	}
	let { options, value, onpick, fill = false, height, fontSize = '12.5px', padX = '12px', radius = '8px' }: Props =
		$props();
</script>

<div class="seg" class:fill style:border-radius={radius}>
	{#each options as o (o.value)}
		<div
			class="opt"
			class:active={o.value === value}
			role="button"
			tabindex="0"
			style:min-height={height}
			style:font-size={fontSize}
			style:padding="{height ? 0 : '4px'} {padX}"
			onclick={() => onpick(o.value)}
		>
			{o.label}
			{#if o.count !== undefined}<span class="count">{o.count}</span>{/if}
		</div>
	{/each}
</div>

<style>
	.seg {
		display: flex;
		background: var(--pe-seg-bg);
		padding: 2px;
		gap: 2px;
	}
	.opt {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		background: transparent;
		color: var(--text-muted);
		white-space: nowrap;
	}
	.fill {
		flex: 1;
	}
	.fill .opt {
		flex: 1;
	}
	.opt.active {
		background: var(--pe-seg-active);
		color: var(--text-normal);
		box-shadow: var(--pe-seg-shadow);
	}
	.count {
		font-size: 11px;
		color: var(--text-muted);
		font-weight: 400;
	}
</style>
