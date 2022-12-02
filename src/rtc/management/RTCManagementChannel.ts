import CustomEventTarget from "../../events/CustomEventTarget";
import RTCConnection from "../connection/RTCConnection";
import { UUIDv4 } from "../node/RTCNode";

export enum RelayMessageType {
	NEW_PEER,
};

export interface RelayMessage<T> {
	type: RelayMessageType,
	target: UUIDv4, // Ultimate target
	relayVia: UUIDv4, // Relay peer ID
	payload: T
}

export default class RTCManagementChannel extends CustomEventTarget<{}> {
	con: RTCConnection;

	ch: RTCDataChannel | null = null;

	readonly label: string;

	private channelListenerCb = (e: RTCDataChannelEvent) => { this.channelEvListener(e); };

	constructor(con: RTCConnection, label = "__rtc-management") {
		super();

		this.label = label;
		this.con = con;
		this.initConnection();
	}

	private channelEvListener(e: RTCDataChannelEvent) {
		const ch = e.channel;

		if (ch.label === this.label) {
			this.ch = ch;

			ch.addEventListener("open", () => { this.onChannelOpen(); });
		}
		
		this.con.con.removeEventListener("datachannel", this.channelListenerCb);
	}

	private initConnection() {
		this.con.con.addEventListener("datachannel", this.channelListenerCb);
	}

	private initChannel() {
		if (this.ch === null) {
			console.warn("Attempt to initialize a null channel!");
			return;
		}

		this.ch.addEventListener("message", (e) => {
			let data: RelayMessage<any>;

			try {
				data = JSON.parse(e.data);
			} catch (err) {
				console.warn(`Received invalid relay data: ${e.data}`);
				return;
			}

			this.onMessage(data);
		});
	}

	private onChannelOpen() {
		this.initChannel();

		console.log("channel open");
		this.ch!.send("Hello world!");
	}

	private onMessage(msg: RelayMessage<any>) {
		
	}

	open() {
		if (this.ch !== null) {
			console.warn("Attempt to open an already opened relay channel!");
			return;
		}

		this.ch = this.con.con.createDataChannel(this.label);
		this.ch.addEventListener("open", () => { this.onChannelOpen(); });
	}
}