<script lang="ts">
	import { filterVariables, type VariableInfo } from '../variables';

	interface Props {
		vars: VariableInfo[];
		narrow: boolean;
		onjump: (id: string) => void;
	}
	let { vars, narrow, onjump }: Props = $props();

	/** T-7: what's typed in the search box. */
	let query = $state('');
	const shown = $derived(filterVariables(vars, query));
</script>

<!-- SRS 3.5: the Variables tab of the first-draft mockup, without its hint line (I-4). -->
<div class="panel">
	{#if vars.length}
		<!-- T-7: looks like the library's search box. -->
		<label class="search" class:narrow>
			<svg width={narrow ? 16 : 15} height={narrow ? 16 : 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
			<input type="text" placeholder="Search variables" aria-label="Search variables" bind:value={query} />
			{#if query}
				<div role="button" tabindex="0" class="clear" aria-label="Clear search" onclick={() => (query = '')}>
					<svg width={narrow ? 14 : 13} height={narrow ? 14 : 13} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>
				</div>
			{/if}
		</label>
	{/if}
	<div class="vars">
		{#each shown as v (v.name)}
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
			{#if vars.length}
				<div class="nomatch">No variables match “{query.trim()}”</div>
			{:else}
				<div class="none">
					<div class="none-title">No variables found</div>
					<div class="none-text">
						Macros like {'{{setvar::name::value}}'} create local variables while the prompt is assembled. None of the prompts that
						are switched on use one.
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>

{#snippet chip(id: string, name: string)}
	<!-- E-7 -->
	<div class="chip" role="button" tabindex="0" title="Jump to prompt" style:min-height={narrow ? '32px' : '24px'} onclick={() => onjump(id)}>
		{name}<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"></path></svg>
	</div>
{/snippet}

<style>
	.panel {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	/* The library's search box (B2 mockups), with its field colour. */
	.search {
		--field: #f3f3f3;
		flex: none;
		height: 34px;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 2px 16px 6px;
		padding: 0 6px 0 10px;
		border-radius: 8px;
		background: var(--field);
		color: var(--text-muted);
	}
	:global(body.theme-dark) .search {
		--field: #2a2a2a;
	}
	.search.narrow {
		height: 40px;
		padding: 0 6px 0 12px;
		border-radius: 10px;
	}
	.search input,
	.search input:hover,
	.search input:focus {
		flex: 1;
		min-width: 0;
		height: auto;
		padding: 0;
		border: 0;
		background: transparent;
		box-shadow: none;
		outline: none;
		color: var(--text-normal);
		font: inherit;
		font-size: 14px;
	}
	.search.narrow input {
		font-size: 16px;
	}
	.clear {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 5px;
		color: var(--text-muted);
		cursor: pointer;
	}
	.narrow .clear {
		width: 32px;
		height: 32px;
	}
	.nomatch {
		padding: 16px 0;
		font-size: 13px;
		color: var(--text-muted);
	}
	.vars {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 2px 16px 24px;
	}
	/* I-5: in the mobile app, the last row clears Obsidian's bottom bar, with one row to spare. */
	:global(body.is-mobile) .vars {
		padding-bottom: calc(var(--navbar-height, 0px) + var(--safe-area-inset-bottom, 0px) + 44px);
	}
	.var {
		padding: 12px 0 14px;
		border-top: 1px solid var(--background-modifier-border);
	}
	.var:first-child {
		border-top: 0;
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
