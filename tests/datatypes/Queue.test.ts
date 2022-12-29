import { describe, expect, test } from "@jest/globals";
import Queue from "../../src/datatypes/Queue";

describe("Queue", () => {
	describe("constructor", () => {
		test("No initial data", () => {
			const q = new Queue();

			expect(q.first).toBe(null);
		});

		test("Initial data", () => {
			const data = [1, 2, 3, 4, 5];
			const q = new Queue(data);

			expect([q.first, q.length]).toStrictEqual([data[0], data.length]);
		});
	});

	describe("length", () => {
		test("Empty queue", () => {
			const q = new Queue();

			expect(q.length).toBe(0);
		});

		test("Filled queue", () => {
			const data = [1, 2, 3, 4, 5];
			const q = new Queue(data);

			expect(q.length).toBe(data.length);
		});
	});

	describe("first", () => {
		test("Empty queue", () => {
			const q = new Queue();

			expect(q.first).toBe(null);
		});

		test("Filled queue", () => {
			const data = [1, 2, 3, 4, 5];
			const q = new Queue(data);

			expect([q.first, q.length]).toStrictEqual([data[0], data.length]);
		});
	});

	describe("isEmpty", () => {
		test("Empty queue", () => {
			const q = new Queue();

			expect(q.isEmpty).toBeTruthy();
		});

		test("Filled queue", () => {
			const data = [1, 2, 3, 4, 5];
			const q = new Queue(data);

			expect(q.isEmpty).toBeFalsy();
		});
	});

	describe("pop", () => {
		test("Filled queue", () => {
			const data = [1, 2, 3, 4, 5];
			const q = new Queue(data);

			const popVal = q.pop();

			expect([popVal, q.length]).toStrictEqual([data[0], data.length - 1]);
		});

		test("Empty queue", () => {
			const q = new Queue();

			expect(q.pop()).toBe(null);
		});
	});

	describe("add", () => {
		test("Empty queue", () => {
			const q = new Queue<number>();
			const val = 5;

			q.add(5);

			expect([q.first, q.length]).toStrictEqual([val, 1]);
		});

		test("Filled queue", () => {
			const data = [1, 2, 3, 4, 5];
			const q = new Queue(data);
			const val = 69;

			q.add(val);

			expect([q.first, q.length]).toStrictEqual([data[0], data.length + 1]);
		});
	});

	describe("empty", () => {
		test("Empty queue", () => {
			const q = new Queue();

			q.empty();

			expect(q.length).toBe(0);
		});

		test("Filled queue", () => {
			const data = [1, 2, 3, 4, 5];
			const q = new Queue(data);

			q.empty();

			expect(q.length).toBe(0);
		});
	});
});
