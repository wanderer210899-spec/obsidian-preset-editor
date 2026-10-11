<script lang="ts">
	import type { VariableInfo } from '../variables';

	interface Props {
		vars: VariableInfo[];
		narrow: boolean;
		onjump: (id: string) => void;
	}
	let { vars, narrow, onjump }: Props = $props();
</script>

<!-- SRS 3.5: the Variables tab of the first-draft mockup. -->
<div class="vars">
	<div class="hint">
		In the order they were first used. Every variable starts empty. {narrow ? 'Tap' : 'Click'} a prompt to jump to it.
	</div>
	{#each vars as v (v.name)}
		<div class="var">
			<div class="top">
				<span class="name">{v.name}</span>
				<span class="value" class:empty={v.value === ''}>{v.value === '' ? 'empty' : v.value}</span>
			</div>
			<div class="uses">
				<span class="label">Set in</span>
				<div class="chips">
					{#each v.setIn as p (p.id)}
						{@render chip(p.id, p.name)}
					{/each}
					{#if !v.setIn.length}<span class="label never">Never set — reads empty</span>{/if}
				</div>
				<span class="label">Read in</span>
				<div class="chips">
					{#each v.readIn as p (p.id)}
						{@render chip(p.id, p.name)}
					{/each}
					{#if !v.readIn.length}<span class="label">Not read</span>{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="none">
			<div class="none-title">No variables found</div>
			<div class="none-text">
				Macros like {'{{setvar::name::value}}'} create local variables while the prompt is assembled. None of the prompts that
				are switched on use one.
			</div>
		</div>
	{/each}
</div>

{#snippet chip(id: string, name: string)}
	<!-- E-7 -->
	<div class="chip" role="button" tabindex="0" title="Jump to prompt" style:min-height={narrow ? '32px' : '24px'} onclick={() => onjump(id)}>
		{name}<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"></path></svg>
	</div>
{/snippet}

<style>
	.vars {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 2px 16px 24px;
	}
	.hint {
		margin: 0 0 10px;
		font-size: 12px;
		line-height: 1.45;
		color: var(--text-muted);
	}
	.var {
		padding: 12px 0 14px;
		border-top: 1px solid var(--background-modifier-border);
	}
	.top {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}
	.name {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
		font-family: var(--font-monospace);
		font-size: 13px;
		color: var(--pe-var);
	}
	.value {
		max-width: 160px;
		padding: 2px 8px;
		border-radius: 5px;
		background: var(--background-modifier-hover);
		font-family: var(--font-monospace);
		font-size: 12.5px;
		color: var(--text-normal);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.value.empty {
		color: var(--text-faint);
	}
	.uses {
		display: grid;
		grid-template-columns: 54px minmax(0, 1fr);
		row-gap: 6px;
		align-items: start;
		font-size: 12px;
	}
	.label {
		padding-top: 4px;
		color: var(--text-muted);
	}
	.label.never {
		color: var(--pe-ctl);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 0 8px;
		border-radius: 5px;
		background: var(--background-modifier-hover);
		color: var(--text-normal);
		cursor: pointer;
	}
	.chip:hover {
		background: var(--background-modifier-active-hover);
		color: var(--text-accent);
	}
	.chip svg {
		opacity: 0.6;
	}
	.none {
		margin-top: 4px;
		padding: 20px 16px;
		border: 1px dashed var(--background-modifier-border-hover);
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.none-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-normal);
	}
	.none-text {
		font-size: 12.5px;
		line-height: 1.55;
		color: var(--text-muted);
	}
</style>
