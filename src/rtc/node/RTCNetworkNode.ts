import RTCConnection, { RTCConnectionHandlers } from "../connection/RTCConnection";
import RTCManagementChannel from "../management/RTCManagementChannel";
import RTCNetwork from "../network/RTCNetwork";
import RTCNetworkNodeStateEvent from "./RTCNetworkNodeStateEvent";
import RTCNode, { UUIDv4 } from "./RTCNode";

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

	get state() {
		return this._state;
	}

	constructor(network: RTCNetwork, config: RTCConfiguration, handlers: RTCConnectionHandlers, id: UUIDv4 | null = null) {
		super(id);

		this.con = new RTCConnection(config, handlers);
		this.management = new RTCManagementChannel(this, network);
		this._state = RTCNetworkNodeState.NEW;
		this.initListeners();
	}

	private initListeners() {
		this.con.addEventListener("state", (ev) => { this.onConnectionStateChange(); });
	}

	private onConnectionStateChange() {
		// They're the same for now
		this.setState(this.con.state as unknown as RTCNetworkNodeState);
	}

	private setState(newState: RTCNetworkNodeState) {
		this._state = newState;
		this.dispatchEvent(new RTCNetworkNodeStateEvent(this.state));
	}

	ensureManagementChannel() {
		if (this.management.ch === null) {
			this.management.open();
		}
	}
}