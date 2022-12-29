export default class Queue<T> {
	private data: T[] = [];

	get length(): number { return this.data.length; }

	get first(): T | null { return this.data[0] ?? null; }

	get isEmpty(): boolean { return this.length === 0; }

	constructor(data: T[] = []) {
		this.data = [...data];
	}

	// Deletes the first element and returns it
	pop(): T | null {
		return this.data.shift() ?? null;
	}

	// Adds the element to end of queue
	add(el: T): void {
		this.data.push(el);
	}

	empty(): void {
		this.data = [];
	}
}
