/**
 * Local variables, as SillyTavern keeps them in a chat's metadata.
 * Ported from the local-variable functions in public/scripts/variables.js
 * (SillyTavern 1.19.0, AGPL-3.0). The Preview has no chat, so a new store
 * starts empty every time (SRS V-11). Values keep SillyTavern's loose types.
 */

export class LocalVariables {
	private readonly vars: Record<string, any> = {};

	/** getLocalVariable: numbers come back as numbers, a missing variable as ''. */
	get(name: string, index?: string): string | number {
		let value = this.vars[name];
		if (index !== undefined) {
			try {
				value = JSON.parse(value);
				const numIndex = Number(index);
				value = Number.isNaN(numIndex) ? value[index] : value[numIndex];
				if (typeof value == 'object') value = JSON.stringify(value);
			} catch {
				// that didn't work
			}
		}
		return value?.trim?.() === '' || isNaN(Number(value)) ? value || '' : Number(value);
	}

	/** setLocalVariable. With an index, sets one entry of a JSON object or array. */
	set(name: string, value: any, index?: string): any {
		if (!name) throw new Error('Variable name cannot be empty or undefined.');
		if (index !== undefined) {
			try {
				let current = JSON.parse(this.vars[name] ?? 'null');
				const numIndex = Number(index);
				if (Number.isNaN(numIndex)) {
					current ??= {};
					current[index] = value;
				} else {
					current ??= [];
					current[numIndex] = value;
				}
				this.vars[name] = JSON.stringify(current);
			} catch {
				// that didn't work
			}
		} else {
			this.vars[name] = value;
		}
		return value;
	}

	/** addLocalVariable: adds numbers, appends to a JSON array, or joins text. */
	add(name: string, value: any): any {
		const currentValue = this.get(name) || 0;
		try {
			const parsedValue = JSON.parse(currentValue as string);
			if (Array.isArray(parsedValue)) {
				parsedValue.push(value);
				this.set(name, JSON.stringify(parsedValue));
				return parsedValue;
			}
		} catch {
			// ignore non-array values
		}
		const increment = Number(value);
		if (isNaN(increment) || isNaN(Number(currentValue))) {
			const stringValue = String(currentValue || '') + value;
			this.set(name, stringValue);
			return stringValue;
		}
		const newValue = Number(currentValue) + increment;
		if (isNaN(newValue)) return '';
		this.set(name, newValue);
		return newValue;
	}

	inc(name: string): any {
		return this.add(name, 1);
	}

	dec(name: string): any {
		return this.add(name, -1);
	}

	has(name: string): boolean {
		return this.vars[name] !== undefined;
	}

	del(name: string): string {
		if (this.has(name)) delete this.vars[name];
		return '';
	}

	/** The variables that hold a value. */
	names(): string[] {
		return Object.keys(this.vars);
	}
}
