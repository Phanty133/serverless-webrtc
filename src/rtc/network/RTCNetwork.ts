import { v4 as uuidv4 } from "uuid";
import CustomEventTarget from "../../events/CustomEventTarget";
import { RelayMessage, RelayMessageType, RTCManagementChannelState } from "../management/RTCManagementChannel";
import RTCNetworkNode, { RTCNetworkNodeState } from "../node/RTCNetworkNode";
import RTCNetworkNodeStateEvent from "../node/RTCNetworkNodeStateEvent";
import RTCNode from "../node/RTCNode";
import RTCConnectionRelay from "./RTCConnectionRelay";
import RTCNetworkPeerEvent from "./RTCNetworkPeerEvent";

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

type RTCNetworkEvents = {
	"peer": RTCNetworkPeerEvent
};

export default class RTCNetwork extends CustomEventTarget<RTCNetworkEvents> {
	readonly local: RTCNode;

	nodes: RTCNetworkNode[] = [];

	readonly config: RTCNetworkConfig;

	connectingNodes: Record<ConnectionId, RTCNetworkNode> = {};

	readonly relay: RTCConnectionRelay;

	constructor(config: RTCNetworkConfig) {
		super();
		this.config = config;
		this.local = new RTCNode();
		this.relay = new RTCConnectionRelay(this);
	}

	addForeignPeer(transport: MessageTransport) {
		const conId = uuidv4();
		// The node has a temporary ID until we receive a session desc answer
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

	getNodeById(id: NodeId) {
		return this.nodes.find((n) => n.id === id) ?? null;
	}

	broadcastManagement<T>(type: RelayMessageType, payload: T, ignoreNode: NodeId | null = null) {
		for (const node of this.nodes) {
			if (node.id === ignoreNode) continue;

			const msg: RelayMessage<T> = {
				type,
				source: this.local.id,
				target: node.id,
				relayVia: null,
				payload
			};

			node.management.send(msg);
		}
	}

	// Creates the node and adds it to connectingNodes
	private createNetworkNode(transport: MessageTransport, conId: ConnectionId, nodeId: NodeId | null = null): RTCNetworkNode {
		const node = new RTCNetworkNode(this, this.config.connection, {
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
				const nodeReadyCb = () => {
					this.nodes.push(node);
					delete this.connectingNodes[conId];

					this.dispatchEvent(new RTCNetworkPeerEvent(node.id));
				};

				// Add the node to the active pool only when the management channel is open
				if (node.management.state === RTCManagementChannelState.OPEN) {
					nodeReadyCb();
				} else {
					node.management.addEventListener("state", (e) => {
						if (e.detail === RTCManagementChannelState.OPEN) {
							nodeReadyCb();
						}
					});
				}
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
			// When receiving the answer, update the node's temporary ID
			this.connectingNodes[connectionId].setId(packet.sourceNode);
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