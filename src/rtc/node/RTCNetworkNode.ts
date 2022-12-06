import RTCConnection, { RTCConnectionHandlers } from "../connection/RTCConnection";
import RTCManagementChannel, { ManagementMessageType } from "../management/RTCManagementChannel";
import RTCNetwork from "../network/RTCNetwork";
import RTCNetworkNodeStateEvent from "./RTCNetworkNodeStateEvent";
import RTCNode, { RTCPeerInfo, UUIDv4 } from "./RTCNode";
import RTCNodeInitEvent from "./RTCNodeInitEvent";

export enum RTCNetworkNodeState {
	NEW,
	CONNECTING,
	CONNECTED,
	BROKEN
};

export default class RTCNetworkNode extends RTCNode {
	readonly con: RTCConnection;

	readonly management: RTCManagementChannel;

	private _state: RTCNetworkNodeState;

	get state(): RTCNetworkNodeState {
		return this._state;
	}

	constructor(network: RTCNetwork, config: RTCConfiguration, handlers: RTCConnectionHandlers, id: UUIDv4 | null = null) {
		super(id);

		this.con = new RTCConnection(config, handlers);
		this.management = new RTCManagementChannel(this, network);
		this._state = RTCNetworkNodeState.NEW;
		this.initListeners();
	}

	private initListeners(): void {
		this.con.addEventListener("state", (ev) => { this.onConnectionStateChange(); });
		this.management.addEventListener("message", (ev) => {
			if (ev.detail.type !== ManagementMessageType.PEER_INFO) return;

			void this.handlePeerInfoMessage(ev.detail.payload);
		});
	}

	private async handlePeerInfoMessage(info: RTCPeerInfo): Promise<void> {
		await this.importPeerInfo(info);
		this.dispatchEvent<"init">(new RTCNodeInitEvent());
	}

	private onConnectionStateChange(): void {
		// They're the same for now
		this.setState(this.con.state as unknown as RTCNetworkNodeState);
	}

	private setState(newState: RTCNetworkNodeState): void {
		this._state = newState;
		this.dispatchEvent(new RTCNetworkNodeStateEvent(this.state));
	}

	ensureManagementChannel(): void {
		if (this.management.ch === null) {
			this.management.open();
		}
	}
}
