import { ManagementMessage, ManagementMessageType, RTCManagementChannelState } from "../management/RTCManagementChannel";
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

	private bindNetworkEvents(): void {
		this.netw.addEventListener("peer", (e: RTCNetworkPeerEvent) => { this.onNewPeer(e.detail); });

		for (const node of this.netw.nodes) {
			node.management.addEventListener("message", (e) => { this.onRelayMessage(e.detail); });
		}
	}

	private onNewPeer(peerId: NodeId): void {
		// When a new peer has been connected,
		// broadcast to all other peers that we have a new peer

		const node = this.netw.getNodeById(peerId);

		if (node === null) {
			console.warn(`Unknown peerID (${peerId})`);
			return;
		}

		const sendFunc = (): void => {
			this.netw.broadcastManagement(ManagementMessageType.NEW_PEER, peerId, peerId);
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

	private onRelayMessage(msg: ManagementMessage<any>): void {
		switch (msg.type) {
			case ManagementMessageType.NEW_PEER:
				this.onRelayNewPeer(msg);
				break;
			case ManagementMessageType.CONN_PACKET:
				this.onRelayConnPacket(msg);
				break;
		}
	}

	private msgTransportFactory(relayNode: RTCNetworkNode, target: NodeId) {
		return (packet: RTCConnectionPacket) => {
			relayNode.management.send({
				type: ManagementMessageType.CONN_PACKET,
				source: this.netw.local.id,
				relayVia: relayNode.id,
				target,
				payload: packet
			});
		};
	}

	private onRelayNewPeer(msg: ManagementMessage<NodeId>): void {
		const newPeerId = msg.payload;

		if (this.netw.getNodeById(newPeerId) !== null) {
			// The node has already been added
			return;
		}

		const relayNode = this.netw.getNodeById(msg.source);

		if (relayNode === null) {
			console.warn(`Unknown relay peer ID (${msg.source})`);
			return;
		}

		this.netw.addForeignPeer(this.msgTransportFactory(relayNode, newPeerId));
	}

	private onRelayConnPacket(msg: ManagementMessage<RTCConnectionPacket>): void {
		const relayNode = (msg.relayVia === null ? this.netw.getNodeById(msg.source) : this.netw.getNodeById(msg.relayVia)) as RTCNetworkNode;

		this.netw.handleIncomingPacket(msg.payload, this.msgTransportFactory(relayNode, msg.source));
	}
}
