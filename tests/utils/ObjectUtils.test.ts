import { describe, test, expect } from "@jest/globals";
import { valOrDefault } from "../../src/utils/ObjectUtils";

describe("ObjectUtils", () => {
	describe("valOrDefault", () => {
		test("No values given", async () => {
			const defaults = {
				a: 1,
				b: 2,
				c: 3
			};
			const vals = {};

			const result = valOrDefault(vals, defaults);
			const expected = {
				a: 1,
				b: 2,
				c: 3
			};

			expect(result).toEqual(expected);
		});

		test("All values given", async () => {
			const defaults = {
				a: 1,
				b: 2,
				c: 3
			};
			const vals = {
				a: 10,
				b: 20,
				c: 30
			};

			const result = valOrDefault(vals, defaults);
			const expected = {
				a: 10,
				b: 20,
				c: 30
			};

			expect(result).toEqual(expected);
		});

		test("Mixed values and defaults", async () => {
			const defaults = {
				a: 1,
				b: 2,
				c: 3
			};
			const vals = {
				a: 69,
				b: 1337
			};

			const result = valOrDefault(vals, defaults);
			const expected = {
				a: 69,
				b: 1337,
				c: 3
			};

			expect(result).toEqual(expected);
		});
	});
});
