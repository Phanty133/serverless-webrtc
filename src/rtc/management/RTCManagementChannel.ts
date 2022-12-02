import CustomEventTarget from "../../events/CustomEventTarget";
import RTCConnection, { RTCConnectionState } from "../connection/RTCConnection";
import RTCConnectionStateEvent from "../connection/RTCConnectionStateEvent";
import RTCNetwork from "../network/RTCNetwork";
import RTCNetworkNode from "../node/RTCNetworkNode";
import RTCNode, { UUIDv4 } from "../node/RTCNode";
import RTCManagementChannelMessageEvent from "./RTCManagementChannelMessageEvent";
import RTCManagementChannelStateEvent from "./RTCManagementChannelStateEvent";

export enum RTCManagementChannelState {
	NEW,
	CONNECTING,
	OPEN,
	BROKEN
}

export enum RelayMessageType {
	NEW_PEER,
};

export interface RelayMessage<TPayload> {
	type: RelayMessageType,
	target: UUIDv4, // Ultimate target
	relayVia: UUIDv4 | null, // Relay peer ID
	payload: TPayload
}

export type RTCManagementChannelEvents = {
	"state": RTCManagementChannelStateEvent,
	"message": RTCManagementChannelMessageEvent,
}

export default class RTCManagementChannel extends CustomEventTarget<RTCManagementChannelEvents> {
	readonly node: RTCNetworkNode;

	ch: RTCDataChannel | null = null;

	readonly netw: RTCNetwork;

	readonly label: string;

	private channelListenerCb = (e: RTCDataChannelEvent) => { this.channelEvListener(e); };

	private _state: RTCManagementChannelState;

	private con: RTCConnection;

	get state() {
		return this._state;
	}

	constructor(node: RTCNetworkNode, netw: RTCNetwork, label = "__rtc-management") {
		super();

		this._state = RTCManagementChannelState.NEW;
		this.netw = netw;
		this.label = label;
		this.node = node;
		this.con = node.con;
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

		this.con.addEventListener("state", (e: RTCConnectionStateEvent) => {
			if (e.detail === RTCConnectionState.CONNECTING) {
				this.setState(RTCManagementChannelState.CONNECTING);
			}
		});
	}

	private initChannel() {
		if (this.ch === null) {
			console.warn("Attempt to initialize a null channel!");
			return;
		}

		this.ch.addEventListener("close", () => { this.setState(RTCManagementChannelState.BROKEN) });
		this.ch.addEventListener("closing", () => { this.setState(RTCManagementChannelState.BROKEN) });

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

		this.setState(RTCManagementChannelState.OPEN);
		this.ch!.send("Hello world!");
	}

	private setState(newState: RTCManagementChannelState) {
		this._state = newState;
		this.dispatchEvent(new RTCManagementChannelStateEvent(newState));
	}

	private onMessage(msg: RelayMessage<any>) {
		if (msg.relayVia === this.netw.local.id) {
			const targetNode = this.netw.getNodeById(msg.target);

			if (targetNode === null) {
				console.warn(`Failed to relay message: Unknown target ID! (Target: ${msg.target})`);
				return;
			}

			targetNode.management.send(msg);
		} else if (msg.target === this.netw.local.id) {
			this.dispatchEvent(new RTCManagementChannelMessageEvent(msg));
		} else {
			console.warn(`Failed to relay message: Received stray message! (Relay: ${msg.relayVia}, Target: ${msg.target})`);
		}
	}

	open() {
		if (this.ch !== null) {
			console.warn("Attempt to open an already opened relay channel!");
			return;
		}

		this.ch = this.con.con.createDataChannel(this.label);
		this.ch.addEventListener("open", () => { this.onChannelOpen(); });
	}

	send<T>(msg: RelayMessage<T>) {
		if (this.state !== RTCManagementChannelState.OPEN) {
			console.warn("Attempt to send a message on an unavailable connection!");
			return;
		}

		if (msg.target !== this.node.id && msg.relayVia !== this.node.id) {
			console.warn("Attempt to send a message to a peer who isn't the relay or the target!");
			return;
		}

		this.ch!.send(JSON.stringify(msg));
	}
}