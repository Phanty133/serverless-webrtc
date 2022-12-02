import { RelayMessage, RelayMessageType, RTCManagementChannelState } from "../management/RTCManagementChannel";
import RTCManagementChannelMessageEvent from "../management/RTCManagementChannelMessageEvent";
import RTCNetworkNode from "../node/RTCNetworkNode";
import RTCNetwork, { NodeId, RTCConnectionPacket } from "./RTCNetwork";
import RTCNetworkPeerEvent from "./RTCNetworkPeerEvent";

// Handles all the connection relay logic
export default class RTCConnectionRelay {
	readonly netw: RTCNetwork;

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
		switch (msg.type) {
			case RelayMessageType.NEW_PEER:
				this.onRelayNewPeer(msg);
				break;
			case RelayMessageType.CONN_PACKET:
				this.onRelayConnPacket(msg);
				break;
		}
	}

	private msgTransportFactory(relayNode: RTCNetworkNode, target: NodeId) {
		return (packet: RTCConnectionPacket) => {
			relayNode.management.send({
				type: RelayMessageType.CONN_PACKET,
				source: this.netw.local.id,
				relayVia: relayNode.id,
				target,
				payload: packet
			});
		};
	}

	private onRelayNewPeer(msg: RelayMessage<NodeId>) {
		const newPeerId = msg.payload;

		if (this.netw.getNodeById(newPeerId) !== null) {
			// The node has already been added
			return;
		}

		const relayNode = this.netw.getNodeById(msg.source)!;
		this.netw.addForeignPeer(this.msgTransportFactory(relayNode, newPeerId));
	}

	private onRelayConnPacket(msg: RelayMessage<RTCConnectionPacket>) {
		const relayNode = msg.relayVia === null ? this.netw.getNodeById(msg.source) : this.netw.getNodeById(msg.relayVia);

		this.netw.handleIncomingPacket(msg.payload, this.msgTransportFactory(relayNode!, msg.source));
	}
}