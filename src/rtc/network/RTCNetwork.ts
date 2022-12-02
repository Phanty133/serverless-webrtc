import { v4 as uuidv4 } from "uuid";
import RTCNetworkNode, { RTCNetworkNodeState } from "../node/RTCNetworkNode";
import RTCNetworkNodeStateEvent from "../node/RTCNetworkNodeStateEvent";
import RTCNode from "../node/RTCNode";

export type UUIDv4 = string;
export type NodeId = UUIDv4;
export type ConnectionId = UUIDv4;

export type MessageTransport = (packet: RTCConnectionPacket) => void;

export interface RTCNetworkConfig {
	connection: RTCConfiguration
}

export interface RTCConnectionPacket {
	sourceNode: NodeId;
	connectionId: ConnectionId;
	type: "SESSION" | "ICE_CANDIDATE";
	payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export default class RTCNetwork extends EventTarget {
	local: RTCNode;

	nodes: RTCNetworkNode[] = [];

	config: RTCNetworkConfig;

	connectingNodes: Record<ConnectionId, RTCNetworkNode> = {};

	constructor(config: RTCNetworkConfig) {
		super();
		this.config = config;
		this.local = new RTCNode();
	}

	addForeignPeer(transport: MessageTransport) {
		const conId = uuidv4();
		const node = this.createNetworkNode(transport, conId);

		node.ensureManagementChannel();
	}

	handleIncomingPacket(packet: RTCConnectionPacket, transport: MessageTransport) {
		switch (packet.type) {
			case "SESSION":
				this.handleSessionDesc(packet, transport);
				break;
			case "ICE_CANDIDATE":
				this.handleICECandidate(packet);
				break;
			default:
				console.warn("Attempt to handle data of unknown type!");
		}
	}

	// Creates the node and adds it to connectingNodes
	private createNetworkNode(transport: MessageTransport, conId: ConnectionId, nodeId: NodeId | null = null): RTCNetworkNode {
		const node = new RTCNetworkNode(this.config.connection, {
			sendSessionCb: (session: RTCSessionDescription) => {
				transport({
					sourceNode: this.local.id,
					connectionId: conId,
					type: "SESSION",
					payload: session,
				});
			},
			sendCandidateCb: (candidate: RTCIceCandidate) => {
				transport({
					sourceNode: this.local.id,
					connectionId: conId,
					type: "ICE_CANDIDATE",
					payload: candidate,
				});
			}
		}, nodeId);

		this.connectingNodes[conId] = node;

		node.addEventListener("state", (e: RTCNetworkNodeStateEvent) => {
			if (e.detail === RTCNetworkNodeState.CONNECTED) {
				this.nodes.push(node);
				delete this.connectingNodes[conId];
			}
		});

		return node;
	}

	private async handleSessionDesc(
		packet: RTCConnectionPacket,
		transport: MessageTransport,
	) {
		const { sourceNode, connectionId } = packet;
		const session = packet.payload as RTCSessionDescriptionInit;

		// If the active connection is null, we have received a new connection offer
		if (!(connectionId in this.connectingNodes)) {
			if (session.type === "answer") {
				console.warn("Atttempt to handle an answer without an active connection!");
				return;
			}

			// Add a node that represents the peer this desc is received from
			const node = this.createNetworkNode(transport, connectionId, sourceNode);
			node.con.handleSessionDesc(session);
		} else {
			await this.connectingNodes[connectionId].con.handleSessionDesc(session);
		}
	}

	private async handleICECandidate(packet: RTCConnectionPacket) {
		if (!(packet.connectionId in this.connectingNodes)) {
			console.warn("Attempt to add candidate without an active connection");
			return;
		}

		this.connectingNodes[packet.connectionId].con.addIceCandidate(packet.payload as RTCIceCandidateInit);
	}
}