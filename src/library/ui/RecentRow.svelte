<script lang="ts">
	import { pressable } from './actions';
	/** L-1: the presets opened last, as cards on top. */
	interface Card {
		path: string;
		name: string;
		folder: string;
		when: string;
	}
	interface Props {
		cards: Card[];
		narrow: boolean;
		onOpen: (path: string) => void;
	}
	let { cards, narrow, onOpen }: Props = $props();
</script>

<div class="pl-recent" class:pl-narrow={narrow}>
	<h2>Recent</h2>
	<div class="pl-cards">
		{#each cards as c (c.path)}
			<div role="button" tabindex="0" use:pressable class="pl-card" onclick={() => onOpen(c.path)}>
				<span class="pl-name">{c.name}</span>
				{#if narrow}
					<span class="pl-meta">{c.folder} · {c.when}</span>
				{:else}
					<span class="pl-meta pl-split"><span class="pl-folder">{c.folder}</span><span class="pl-when">{c.when}</span></span>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.pl-recent {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	h2 {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-muted);
	}
	.pl-narrow h2 {
		margin: 0 16px;
	}
	.pl-cards {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 10px;
	}
	.pl-narrow .pl-cards {
		display: flex;
		padding: 0 16px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.pl-narrow .pl-cards::-webkit-scrollbar {
		display: none;
	}
	.pl-card {
		height: 72px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 10px 12px;
		border: 1px solid var(--pl-card-line);
		border-radius: 10px;
		background: var(--background-primary);
		color: var(--text-normal);
		min-width: 0;
	}
	.pl-card:hover {
		background: var(--pl-hover);
	}
	.pl-narrow .pl-card {
		width: 150px;
		height: 76px;
		flex: none;
		border-radius: 12px;
	}
	.pl-name {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pl-meta {
		font-size: 12px;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pl-split {
		display: flex;
		justify-content: space-between;
		gap: 6px;
	}
	.pl-folder {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pl-when {
		flex: none;
	}
</style>
