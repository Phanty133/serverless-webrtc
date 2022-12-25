import { describe, test, expect } from "@jest/globals";
import { asyncFilter } from "../../src/utils/ArrayUtils";

describe("ArrayUtils", () => {
	describe("asyncFilter", () => {
		test("Valid async predicate", async () => {
			const arr = [1, 2, 3, 4, 5];
			const predicate = async (val: number): Promise<boolean> => { return val > 2; };

			const filtered = await asyncFilter(arr, predicate);
			const expected = [3, 4, 5];

			if (filtered !== null) filtered.sort((a, b) => a - b);
			expected.sort((a, b) => a - b);

			expect(filtered).toEqual(expected);
		});

		test("Async predicate with error - Don't continue", async () => {
			const arr = [1, 2, 3, 4, 5];
			const predicate = async (val: number): Promise<boolean> => {
				if (val === 3) {
					throw Error("Predicate test error");
				} else {
					return val > 2;
				}
			};

			const filtered = await asyncFilter(arr, predicate, false);
			const expected = null;

			if (filtered !== null) filtered.sort((a, b) => a - b);
			// expected.sort((a, b) => a - b);

			expect(filtered).toEqual(expected);
		});

		test("Async predicate with error - Continue", async () => {
			const arr = [1, 2, 3, 4, 5];
			const predicate = async (val: number): Promise<boolean> => {
				if (val === 3) {
					throw Error("Predicate test error");
				} else {
					return val > 2;
				}
			};

			const filtered = await asyncFilter(arr, predicate, true);
			const expected = [4, 5];

			if (filtered !== null) filtered.sort((a, b) => a - b);
			expected.sort((a, b) => a - b);

			expect(filtered).toEqual(expected);
		});

		test("Empty", async () => {
			const arr: number[] = [];
			const predicate = async (val: number): Promise<boolean> => val > 2;

			const filtered = await asyncFilter(arr, predicate);
			const expected: number[] = [];

			if (filtered !== null) filtered.sort((a, b) => a - b);
			expected.sort((a, b) => a - b);

			expect(filtered).toEqual(expected);
		});
	});
});
