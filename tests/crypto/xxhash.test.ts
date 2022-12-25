import { describe, expect, test } from "@jest/globals";
import getXXHashInstance, { clearXXHashInstance } from "../../src/crypto/xxhash";

describe("crypto", () => {
	describe("getXXHashInstance", () => {
		test("New instance", async () => {
			const inst = await getXXHashInstance();
			const input = "HelloWorld!";

			const result = inst.h64ToString(input);
			const expected = "a00b699f76d2cf27";

			expect(result).toBe(expected);
		});

		test("Cached instance", async () => {
			clearXXHashInstance();
			await getXXHashInstance();
			const inst = await getXXHashInstance();
			const input = "HelloWorld!";

			const result = inst.h64ToString(input);
			const expected = "a00b699f76d2cf27";

			expect(result).toBe(expected);
		});
	});

	describe("clearXXHashInstance", () => {
		test("Clear instance", async () => {
			const inst = await getXXHashInstance();
			clearXXHashInstance();
			const newInst = await getXXHashInstance();

			expect(newInst).not.toBe(inst);
		});
	});
});
