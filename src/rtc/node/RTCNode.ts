import { v4 as uuidv4 } from "uuid";
import * as IPFS from "ipfs-core";
import CustomEventTarget from "../../events/CustomEventTarget";
import RTCNetworkNodeStateEvent from "./RTCNetworkNodeStateEvent";
import RTCNodeIPFSInitEvent from "./RTCNodeIPFSInitEvent";

export type UUIDv4 = string;
export type IPFSID = string;

type RTCNodeEvents = {
	"state": RTCNetworkNodeStateEvent,
	"ipfsinit": RTCNodeIPFSInitEvent
};

export default class RTCNode extends CustomEventTarget<RTCNodeEvents> {
	private _id: UUIDv4;
	get id() { return this._id; }

	ipfs: IPFS.IPFS | null = null;
	readonly ipfsTopic: string;

	constructor(id: UUIDv4 | null = null, ipfsTopic = "__rtc-ipfstransport") {
		super();
		this._id = id === null ? uuidv4() : id;
		this.ipfsTopic = ipfsTopic;
		this.initIpfs();
	}

	private async initIpfs() {
		this.ipfs = await IPFS.create();
		const id = await this.getIPFSID();

		this.dispatchEvent<"ipfsinit">(new RTCNodeIPFSInitEvent(id!));
	}

	async subIPFSRTC() {
		if (this.ipfs === null) {
			console.warn("Unable to subscribe to IPFS PubSub. IPFS not initialized!");
			return null;
		}

		await this.ipfs.pubsub.subscribe(this.ipfsTopic, (msg) => {
			const textDec = new TextDecoder();
			this.onPubSubMessage(textDec.decode(msg.data));
		});
	}

	async sendToIPFSRTC(msg: string) {
		if (this.ipfs === null) {
			console.warn("Unable to send to IPFS PubSub. IPFS not initialized!");
			return null;
		}

		const textEnc = new TextEncoder();
		await this.ipfs.pubsub.publish(this.ipfsTopic, textEnc.encode(msg));
	}

	private onPubSubMessage(msg: string) {
		console.log(`New IPFS message: ${msg} (ID: ${this.id})`);
	}

	async getIPFSID() {
		if (this.ipfs === null) {
			console.warn("Unable to get IPFS ID. IPFS not initialized!");
			return null;
		}

		return (await this.ipfs.id()).id.toString();
	}

	setId(newId: UUIDv4) {
		this._id = newId;
	}
}