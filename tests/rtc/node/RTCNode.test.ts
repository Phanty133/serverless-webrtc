import { describe, expect, test } from "@jest/globals";
import * as crypto from "crypto";
import RTCNode, { RTCPeerInfo } from "../../../src/rtc/node/RTCNode";
import * as ArrayBufferUtils from "../../../src/utils/ArrayBufferUtils";

async function genKeypair(): Promise<CryptoKeyPair> {
	return await window.crypto.subtle.generateKey(
		{
			name: RTCNode.KEY_ALG,
			modulusLength: 4096,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: "SHA-256"
		},
		true,
		["sign", "verify"]
	);
}

async function genHexPubkey(): Promise<string> {
	const keypair = await genKeypair();
	const pubkey = await window.crypto.subtle.exportKey(RTCNode.KEY_FORMAT, keypair.publicKey);
	return ArrayBufferUtils.buf2hex(pubkey);
}

describe("RTCNode", () => {
	describe("constructor", () => {
		test("Default", () => {
			const node = new RTCNode();

			expect([typeof node.id === "string", node.generatingKeys]).toStrictEqual([true, false]);
		});

		test("Preset ID", () => {
			const id = crypto.randomUUID();
			const node = new RTCNode(id);

			expect(node.id).toBe(id);
		});

		test("Generate keys", async () => {
			const node = new RTCNode(null, true);

			expect(node.generatingKeys).toBeTruthy();
		});
	});

	describe("id", () => {
		test("Preset ID", () => {
			const id = crypto.randomUUID();
			const node = new RTCNode(id);

			expect(node.id).toBe(id);
		});
	});

	describe("pubkey", () => {
		test("No pubkey", () => {
			const node = new RTCNode();

			expect(node.pubkey).toBe(null);
		});

		test("Only pubkey", async () => {
			const node = new RTCNode();
			const pubkey = await genHexPubkey();

			await node.setPublicKey(pubkey);

			if (node.pubkey === null) {
				throw new Error("Node pubkey shouldn't be null");
			}

			const nodeKey = await window.crypto.subtle.exportKey(RTCNode.KEY_FORMAT, node.pubkey);
			const nodeKeyHex = ArrayBufferUtils.buf2hex(nodeKey);

			expect(nodeKeyHex).toBe(pubkey);
		});

		test("Keypair", async () => {
			const node = new RTCNode();
			await node.genKeys();

			expect(node.pubkey).not.toBe(null);
		});
	});

	describe("setId", () => {
		test("Set ID", () => {
			const node = new RTCNode();
			const newId = crypto.randomUUID();

			node.setId(newId);

			expect(node.id).toBe(newId);
		});
	});

	describe("setPublicKey", () => {
		test("Invalid public key", async () => {
			const node = new RTCNode();

			await node.setPublicKey("INVALID KEY LOL");

			expect(node.pubkey).toBe(null);
		});

		test("Valid public key", async () => {
			const node = new RTCNode();
			const pubkey = await genHexPubkey();

			await node.setPublicKey(pubkey);

			if (node.pubkey === null) {
				throw new Error("Node pubkey shouldn't be null");
			}

			const nodeKey = await window.crypto.subtle.exportKey(RTCNode.KEY_FORMAT, node.pubkey);
			const nodeKeyHex = ArrayBufferUtils.buf2hex(nodeKey);

			expect(nodeKeyHex).toBe(pubkey);
		});
	});

	describe("genKeys", () => {
		test("Keypair generation", async () => {
			const node = new RTCNode();

			node.addEventListener("keygen", () => {
				expect(node.pubkey).not.toBe(null);
				expect(node.generatingKeys).toBeFalsy();
			});

			await node.genKeys();

			if (node.generatingKeys) {
				throw new Error("Keys should already be generated");
			}
		});
	});

	describe("sign", () => {
		test("No keypair", async () => {
			const node = new RTCNode();
			const data = "Hello world!";

			const result = await node.sign(data);

			expect(result).toBe(null);
		});

		test("Valid keypair", async () => {
			const node = new RTCNode();
			const data = "Hello world!";

			await node.genKeys();

			const result = await node.sign(data);

			expect(result).not.toBe(null);
			expect(typeof result).toBe("string");
			expect(result?.length).not.toBe(0);
		});
	});

	describe("verify", () => {
		test("No keypair or pubkey", async () => {
			const node = new RTCNode();
			const result = await node.verify("InvalidSig", "Hello world!");

			expect(result).toBe(null);
		});

		test("Invalid signature", async () => {
			const node = new RTCNode();
			await node.genKeys();

			const result = await node.verify("InvalidSig", "Hello world!");

			expect(result).toBe(null);
		});

		test("Valid pubkey, valid signature", async () => {
			const node = new RTCNode();
			await node.genKeys();
			const data = "Hello world!";

			const sig = await node.sign(data);

			if (sig === null) {
				throw new Error("Signature shouldn't be null");
			}

			const result = await node.verify(sig, data);

			expect(result).toBeTruthy();
		});

		test("Valid pubkey, fake signature", async () => {
			const node = new RTCNode();
			await node.genKeys();
			const data = "Hello world!";

			const sig = await node.sign(data);

			if (sig === null) {
				throw new Error("Signature shouldn't be null");
			}

			const result = await node.verify(sig, "DifferentData");

			expect(result).toBeFalsy();
		});
	});

	describe("exportPublicKey", () => {
		test("No pubkey", async () => {
			const node = new RTCNode();
			const result = await node.exportPubKey();

			expect(result).toBe(null);
		});

		test("Imported pubkey", async () => {
			const node = new RTCNode();
			const pubkey = await genHexPubkey();
			await node.setPublicKey(pubkey);

			const result = await node.exportPubKey();

			expect(result).toBe(pubkey);
		});

		test("Generated keypair", async () => {
			const node = new RTCNode();
			await node.genKeys();

			const result = await node.exportPubKey();

			expect(result).not.toBe(null);
		});
	});

	describe("importPeerInfo", () => {
		test("Import info", async () => {
			const node = new RTCNode();
			const peerInfo: RTCPeerInfo = {
				pubkey: await genHexPubkey()
			};

			await node.importPeerInfo(peerInfo);

			expect(await node.exportPubKey()).toBe(peerInfo.pubkey);
		});
	});

	describe("exportPeerInfo", () => {
		test("No pubkey", async () => {
			const node = new RTCNode();

			await expect(node.exportPeerInfo())
				.rejects
				.toThrowError();
		});

		test("Imported pubkey", async () => {
			const node = new RTCNode();
			const pubkey = await genHexPubkey();

			await node.setPublicKey(pubkey);

			const result = await node.exportPeerInfo();

			expect(result).toStrictEqual({ pubkey });
		});

		test("Generated keypair", async () => {
			const node = new RTCNode();
			await node.genKeys();

			await expect(node.exportPeerInfo())
				.resolves.not
				.toThrowError();
		});
	});
});
