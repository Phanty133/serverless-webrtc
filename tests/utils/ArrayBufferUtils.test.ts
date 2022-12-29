import { describe, expect, test } from "@jest/globals";
import { buf2hex, hex2buf, str2buf } from "../../src/utils/ArrayBufferUtils";

describe("ArrayBufferUtils", () => {
	describe("buf2hex", () => {
		test("Empty buffer", async () => {
			const buf = new Uint8Array([]);

			const result = buf2hex(buf);
			const expected = "";

			expect(result).toBe(expected);
		});

		test("Valid buffer", async () => {
			const buf = new Uint8Array([80, 70, 60, 64]);

			const result = buf2hex(buf);
			const expected = "50463c40";

			expect(result).toBe(expected);
		});
	});

	describe("hex2buf", () => {
		test("Empty hex", async () => {
			const hex = "";

			const result = hex2buf(hex);
			const expected = new Uint8Array();

			expect(result?.buffer).toEqual(expected.buffer);
		});

		test("Valid hex", async () => {
			const hex = "abcdef1337";

			const result = hex2buf(hex);
			const expected = new Uint8Array([171, 205, 239, 19, 55]);

			expect(result?.buffer).toEqual(expected.buffer);
		});

		test("Invalid hex", async () => {
			const hex = "Hello world!";

			const result = hex2buf(hex);
			const expected = null;

			expect(result).toBe(expected);
		});
	});

	describe("str2buf", () => {
		test("Empty string", async () => {
			const str = "";

			const result = str2buf(str);
			const expected = new Uint8Array();

			expect(result.buffer).toEqual(expected.buffer);
		});

		test("ASCII-only string", async () => {
			const str = "abcdef";

			const result = str2buf(str);
			const expected = new Uint8Array([97, 98, 99, 100, 101, 102]);

			expect(result.buffer).toEqual(expected.buffer);
		});

		test("Unicode string", async () => {
			const str = "ab🗿🗿";

			const result = str2buf(str);
			const expected = new Uint8Array([97, 98, 240, 159, 151, 191, 240, 159, 151, 191]);

			expect(result.buffer).toEqual(expected.buffer);
		});
	});
});
