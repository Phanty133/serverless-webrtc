import { v4 as uuidv4 } from "uuid";
import CustomEventTarget, { CustomEventList } from "../../events/CustomEventTarget";
import { ManagementMessage, ManagementMessageType, RTCManagementChannelState } from "../management/RTCManagementChannel";
import RTCNetworkNode, { RTCNetworkNodeState } from "../node/RTCNetworkNode";
import RTCNetworkNodeStateEvent from "../node/RTCNetworkNodeStateEvent";
import RTCNode from "../node/RTCNode";
import RTCConnectionRelay from "./RTCConnectionRelay";
import RTCNetworkInitEvent from "./RTCNetworkInitEvent";
import RTCNetworkPeerEvent from "./RTCNetworkPeerEvent";

export type UUIDv4 = string;
export type NodeId = UUIDv4;
export type ConnectionId = UUIDv4;

export type MessageTransport = (packet: RTCConnectionPacket) => void;

export interface RTCNetworkConfig {
	connection: RTCConfiguration
}

export interface RTCConnectionPacket {
	sourceNode: NodeId
	connectionId: ConnectionId
	type: "SESSION" | "ICE_CANDIDATE"
	payload: RTCSessionDescriptionInit | RTCIceCandidateInit
}

interface RTCNetworkEvents extends CustomEventList {
	"init": RTCNetworkInitEvent
	"peer": RTCNetworkPeerEvent
}

export default class RTCNetwork extends CustomEventTarget<RTCNetworkEvents> {
	readonly local: RTCNode;

	nodes: RTCNetworkNode[] = [];

	readonly config: RTCNetworkConfig;

	connectingNodes: Map<ConnectionId, RTCNetworkNode> = new Map();

	readonly relay: RTCConnectionRelay;

	private _initialized = false;

	get initialized(): boolean { return this._initialized; }

	constructor(config: RTCNetworkConfig) {
		super();
		this.config = config;
		this.local = new RTCNode(null, true);
		this.relay = new RTCConnectionRelay(this);

		this.bindLocalListeners();
	}

	private bindLocalListeners(): void {
		this.local.addEventListener("keygen", () => {
			this._initialized = true;
			this.dispatchEvent<"init">(new RTCNetworkInitEvent());
		});
	}

	addForeignPeer(transport: MessageTransport): void {
		const conId = uuidv4();
		// The node has a temporary ID until we receive a session desc answer
		const node = this.createNetworkNode(transport, conId);

		node.ensureManagementChannel();
	}

	handleIncomingPacket(packet: RTCConnectionPacket, transport: MessageTransport): void {
		switch (packet.type) {
			case "SESSION":
				void this.handleSessionDesc(packet, transport);
				break;
			case "ICE_CANDIDATE":
				void this.handleICECandidate(packet);
				break;
			default:
				console.warn("Attempt to handle data of unknown type!");
		}
	}

	getNodeById(id: NodeId): RTCNetworkNode | null {
		return this.nodes.find((n) => n.id === id) ?? null;
	}

	broadcastManagement<T>(type: ManagementMessageType, payload: T, ignoreNode: NodeId | null = null): void {
		for (const node of this.nodes) {
			if (node.id === ignoreNode) continue;

			const msg: ManagementMessage<T> = {
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
					payload: session
				});
			},
			sendCandidateCb: (candidate: RTCIceCandidate) => {
				transport({
					sourceNode: this.local.id,
					connectionId: conId,
					type: "ICE_CANDIDATE",
					payload: candidate
				});
			}
		}, nodeId);

		this.connectingNodes.set(conId, node);

		node.addEventListener("state", (e: RTCNetworkNodeStateEvent) => {
			if (e.detail === RTCNetworkNodeState.CONNECTED) void this.onNodeConnected(node, conId);
		});

		node.addEventListener("init", () => {
			console.log("node init");

			this.nodes.push(node);
			this.connectingNodes.delete(conId);

			this.dispatchEvent(new RTCNetworkPeerEvent(node.id));
		});

		return node;
	}

	private async onNodeConnected(node: RTCNetworkNode, conId: ConnectionId): Promise<void> {
		// When the node is connected, exchange peer info
		const peerInfo = await this.local.exportPeerInfo();

		const chReadyCb = (): void => {
			node.management.send({
				type: ManagementMessageType.PEER_INFO,
				source: this.local.id,
				relayVia: null,
				target: node.id,
				payload: peerInfo
			});
		};

		// Add the node to the active pool only when the management channel is open
		if (node.management.state === RTCManagementChannelState.OPEN) {
			chReadyCb();
		} else {
			node.management.addEventListener("state", (e) => {
				if (e.detail === RTCManagementChannelState.OPEN) chReadyCb();
			});
		}
	}

	private async handleSessionDesc(packet: RTCConnectionPacket, transport: MessageTransport): Promise<void> {
		const { sourceNode, connectionId } = packet;
		const session = packet.payload as RTCSessionDescriptionInit;

		// If the active connection is null, we have received a new connection offer
		if (!this.connectingNodes.has(connectionId)) {
			if (session.type === "answer") {
				console.warn("Atttempt to handle an answer without an active connection!");
				return;
			}

			// Add a node that represents the peer this desc is received from
			const node = this.createNetworkNode(transport, connectionId, sourceNode);
			await node.con.handleSessionDesc(session);
		} else {
			const node = this.connectingNodes.get(connectionId);
			// When receiving the answer, update the node's temporary ID
			node?.setId(packet.sourceNode);
			await node?.con.handleSessionDesc(session);
		}
	}

	private async handleICECandidate(packet: RTCConnectionPacket): Promise<void> {
		if (!this.connectingNodes.has(packet.connectionId)) {
			console.warn("Attempt to add candidate without an active connection");
			return;
		}

		await this.connectingNodes.get(packet.connectionId)?.con.addIceCandidate(packet.payload as RTCIceCandidateInit);
	}
}
