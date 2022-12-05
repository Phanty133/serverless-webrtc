import { v4 as uuidv4 } from "uuid";
import { ArrayBufferUtils } from "../../utils/ArrayBufferUtils";
import CustomEventTarget from "../../events/CustomEventTarget";
import RTCNetworkNodeStateEvent from "./RTCNetworkNodeStateEvent";
import RTCNodeKeygenEvent from "./RTCNodeKeygenEvent";

export type UUIDv4 = string;

type RTCNodeEvents = {
	"state": RTCNetworkNodeStateEvent,
	"keygen": RTCNodeKeygenEvent
};

export default class RTCNode extends CustomEventTarget<RTCNodeEvents> {
	static KEY_ALG = "RSASSA-PKCS1-v1_5";

	private _id: UUIDv4;
	private _pubkey: CryptoKey | null = null;
	private keypair: CryptoKeyPair | null = null;

	get id() { return this._id; }
	get pubkey() {
		return this.keypair === null ? this._pubkey : this.keypair.publicKey;
	}

	constructor(id: UUIDv4 | null = null, genKeys = false) {
		super();
		this._id = id === null ? uuidv4() : id;

		if (genKeys) this.genKeys();
	}

	setId(newId: UUIDv4) {
		this._id = newId;
	}

	async setPublicKey(key: string) {
		this._pubkey = await window.crypto.subtle.importKey(
			"raw",
			ArrayBufferUtils.hex2buf(key),
			{ name: RTCNode.KEY_ALG, hash: "SHA-256" },
			false,
			["verify"]
		);
	}
	
	async genKeys() {
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

		this.dispatchEvent<"keygen">(new RTCNodeKeygenEvent());
	}

	async sign(data: string) {
		if (this.keypair === null) {
			console.warn("Attempt to sign data before generating a key pair!");
			return;
		}

		const sig = await window.crypto.subtle.sign(
			RTCNode.KEY_ALG,
			this.keypair.privateKey,
			ArrayBufferUtils.str2buf(data)
		);

		return ArrayBufferUtils.buf2hex(sig);
	}

	async verify(sig: string, data: string) {
		if (this.pubkey === null) {
			console.warn("Attempt to verify data before generating or assigning a public key!");
			return;
		}

		return window.crypto.subtle.verify(
			RTCNode.KEY_ALG,
			this.pubkey,
			ArrayBufferUtils.str2buf(sig),
			ArrayBufferUtils.str2buf(data)
		);
	}

	async exportPubKey() {
		if (this.pubkey === null) {
			console.warn("Attempt to export pubkey before generating or assigning a public key!");
			return;
		}

		return ArrayBufferUtils.buf2hex(await window.crypto.subtle.exportKey("raw", this.pubkey));
	}
}