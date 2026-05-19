/**
 * Interactive agent stack picker (pi-tui overlay).
 */
import type { Theme } from "@earendil-works/pi-coding-agent";
import { Container, Key, Spacer, Text, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import type { AgentStackItem } from "./agent-stack.ts";
import { formatStackLabel } from "./agent-stack.ts";

export interface AgentStackPick {
	item: AgentStackItem;
}

export class AgentStackSelector extends Container {
	private selected = 0;
	private readonly th: Theme;
	private readonly items: AgentStackItem[];
	private readonly onPick: (pick: AgentStackPick) => void;
	private readonly onCancel: () => void;

	constructor(
		th: Theme,
		items: AgentStackItem[],
		onPick: (pick: AgentStackPick) => void,
		onCancel: () => void,
	) {
		super();
		this.th = th;
		this.items = items;
		this.onPick = onPick;
		this.onCancel = onCancel;
		this.selected = 0;
		this.render();
	}

	private render(): void {
		this.clear();
		const w = Math.min(72, (process.stdout.columns || 80) - 4);
		this.addChild(new Text(this.th.fg("accent", " Agent stack "), 0, 0));
		this.addChild(new Spacer(1));
		this.addChild(
			new Text(
				this.th.fg("dim", " ↑↓ move · Enter follow · Esc cancel "),
				0,
				0,
			),
		);
		this.addChild(new Spacer(1));
		if (this.items.length === 0) {
			this.addChild(new Text(this.th.fg("warning", " No agents in stack "), 0, 0));
			return;
		}
		for (let i = 0; i < this.items.length; i++) {
			const line = formatStackLabel(this.items[i]!, i === this.selected);
			const styled =
				i === this.selected
					? this.th.fg("accent", truncateToWidth(line, w))
					: this.th.fg("dim", truncateToWidth(line, w));
			this.addChild(new Text(styled, 0, 0));
		}
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.up) || matchesKey(data, "up")) {
			if (this.items.length === 0) return;
			this.selected = (this.selected - 1 + this.items.length) % this.items.length;
			this.render();
			return;
		}
		if (matchesKey(data, Key.down) || matchesKey(data, "down")) {
			if (this.items.length === 0) return;
			this.selected = (this.selected + 1) % this.items.length;
			this.render();
			return;
		}
		if (matchesKey(data, Key.enter) || data === "\r" || data === "\n") {
			const item = this.items[this.selected];
			if (item) this.onPick({ item });
			return;
		}
		if (matchesKey(data, Key.escape) || data === "q") {
			this.onCancel();
		}
	}

	invalidate(): void {
		this.render();
	}
}
