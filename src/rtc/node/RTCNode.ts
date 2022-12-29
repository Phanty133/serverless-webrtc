import { v4 as uuidv4 } from "uuid";
import * as ArrayBufferUtils from "../../utils/ArrayBufferUtils";
import CustomEventTarget, { CustomEventList } from "../../events/CustomEventTarget";
import RTCNetworkNodeStateEvent from "./RTCNetworkNodeStateEvent";
import RTCNodeKeygenEvent from "./RTCNodeKeygenEvent";
import RTCNodeInitEvent from "./RTCNodeInitEvent";

export type UUIDv4 = string;

export interface RTCPeerInfo {
	pubkey: string
}

interface RTCNodeEvents extends CustomEventList {
	"state": RTCNetworkNodeStateEvent
	"keygen": RTCNodeKeygenEvent
	"init": RTCNodeInitEvent
}

export default class RTCNode extends CustomEventTarget<RTCNodeEvents> {
	static readonly KEY_ALG = "RSASSA-PKCS1-v1_5";
	static readonly KEY_FORMAT = "spki";

	private _id: UUIDv4;
	private _pubkey: CryptoKey | null = null;
	private _generatingKeys = false;
	private keypair: CryptoKeyPair | null = null;

	get id(): UUIDv4 {
		return this._id;
	}

	get pubkey(): CryptoKey | null {
		return this.keypair === null ? this._pubkey : this.keypair.publicKey;
	}

	get generatingKeys(): boolean {
		return this._generatingKeys;
	}

	constructor(id: UUIDv4 | null = null, genKeys = false) {
		super();
		this._id = id === null ? uuidv4() : id;

		if (genKeys) {
			this.genKeys().catch((err: string) => console.warn(`Error generating keys (${err})`));
		}
	}

	setId(newId: UUIDv4): void {
		this._id = newId;
	}

	async setPublicKey(key: string): Promise<void> {
		const hexbuf = ArrayBufferUtils.hex2buf(key);

		if (hexbuf === null) {
			console.warn(`Attempt to set invalid public key (${key})`);
			return;
		}

		this._pubkey = await window.crypto.subtle.importKey(
			RTCNode.KEY_FORMAT,
			hexbuf,
			{ name: RTCNode.KEY_ALG, hash: "SHA-256" },
			true,
			["verify"]
		);
	}

	async genKeys(): Promise<void> {
		this._generatingKeys = true;

		this.keypair = await window.crypto.subtle.generateKey(
			{
				name: RTCNode.KEY_ALG,
				modulusLength: 4096,
				publicExponent: new Uint8Array([1, 0, 1]),
				hash: "SHA-256"
			},
			true,
			["sign", "verify"]
		);

		this._generatingKeys = false;

		this.dispatchEvent<"keygen">(new RTCNodeKeygenEvent());
	}

	async sign(data: string): Promise<string | null> {
		if (this.keypair === null) {
			console.warn("Attempt to sign data before generating a key pair!");
			return null;
		}

		const sig = await window.crypto.subtle.sign(
			RTCNode.KEY_ALG,
			this.keypair.privateKey,
			ArrayBufferUtils.str2buf(data)
		);

		return ArrayBufferUtils.buf2hex(sig);
	}

	async verify(sig: string, data: string): Promise<boolean | null> {
		if (this.pubkey === null) {
			console.warn("Attempt to verify data before generating or assigning a public key!");
			return null;
		}

		const sigBuf = ArrayBufferUtils.hex2buf(sig);

		if (sigBuf === null) {
			console.warn(`Attempt to verify invalid signature (${sig})`);
			return null;
		}

		return await window.crypto.subtle.verify(
			RTCNode.KEY_ALG,
			this.pubkey,
			sigBuf,
			ArrayBufferUtils.str2buf(data)
		);
	}

	async exportPubKey(): Promise<string | null> {
		if (this.pubkey === null) {
			console.warn("Attempt to export pubkey before generating or assigning a public key!");
			return null;
		}

		const key = await window.crypto.subtle.exportKey(RTCNode.KEY_FORMAT, this.pubkey);

		return ArrayBufferUtils.buf2hex(key);
	}

	async exportPeerInfo(): Promise<RTCPeerInfo> {
		const pubkey = await this.exportPubKey();

		if (pubkey === null) {
			throw new TypeError("Pubkey not set or generated!");
		}

		return { pubkey };
	}

	async importPeerInfo(info: RTCPeerInfo): Promise<void> {
		await this.setPublicKey(info.pubkey);
	}
}
