import { RelayMessage, RelayMessageType, RTCManagementChannelState } from "../management/RTCManagementChannel";
import RTCManagementChannelMessageEvent from "../management/RTCManagementChannelMessageEvent";
import RTCNetwork, { NodeId } from "./RTCNetwork";
import RTCNetworkPeerEvent from "./RTCNetworkPeerEvent";

// Handles all the connection relay logic
export default class RTCConnectionRelay {
	netw: RTCNetwork;

	constructor(netw: RTCNetwork) {
		this.netw = netw;

		this.bindNetworkEvents();
	}

	private bindNetworkEvents() {
		this.netw.addEventListener("peer", (e: RTCNetworkPeerEvent) => { this.onNewPeer(e.detail); });

		for (const node of this.netw.nodes) {
			node.management.addEventListener("message", (e) => { this.onRelayMessage(e.detail); });
		}
	}

	private onNewPeer(peerId: NodeId) {
		// When a new peer has been connected,
		// broadcast to all other peers that we have a new peer

		const node = this.netw.getNodeById(peerId)!;

		const sendFunc = () => {
			this.netw.broadcastManagement(RelayMessageType.NEW_PEER, peerId, peerId);
		};

		if (node.management.state === RTCManagementChannelState.OPEN) {
			sendFunc();
		} else {
			node.management.addEventListener("state", (e) => {
				if (e.detail === RTCManagementChannelState.OPEN) {
					sendFunc();
				}
			});
		}

		node.management.addEventListener("message", (e) => { this.onRelayMessage(e.detail); });
	}

	private onRelayMessage(msg: RelayMessage<any>) {
		if (msg.type === RelayMessageType.NEW_PEER) {
			this.onRelayNewPeer(msg);
		}
	}

	private onRelayNewPeer(msg: RelayMessage<NodeId>) {
		console.log(msg);
	}
}