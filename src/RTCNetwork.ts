import { v4 as uuidv4 } from "uuid";
import RTCConnection from "./RTCConnection";

export type SendSessionHandler = (sessionDesc: RTCNetworkConnectionAttemptData) => void;
export type SendCandidateHandler = (candidate: RTCNetworkConnectionAttemptData) => void;

export type UUIDv4 = string;
export type RTCConnectionID = UUIDv4;
export type RTCConnectionAttemptID = UUIDv4;

export interface RTCNetworkConnectionAttemptData {
	sessionId: RTCConnectionAttemptID;
	type: "SESSION" | "ICE_CANDIDATE";
	payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export default class RTCNetwork {
	// Every peer has a UUIDv4 assigned to them when they connect
	connections: Record<RTCConnectionID, RTCConnection> = {};

	// Data channels used for connecting new peers
	conRelayChannels: Record<RTCConnectionID, RTCDataChannel> = {};

	// Connections that haven't been established yet
	activeConnections: Record<RTCConnectionAttemptID, RTCConnection> = {};

	constructor() {}

	// Create the connection and set it as the active connection
	private createNewConnection(
		sendSessionHandler: SendSessionHandler,
		sendCandidateHandler: SendCandidateHandler,
		offerAttemptId: RTCConnectionAttemptID | null = null
	): RTCConnection {
		const con = new RTCConnection(uuidv4());
		const attemptId = this.setActiveConnection(con, offerAttemptId);

		if (attemptId) {
			con.setOptions({
				sendSessionCb: (session: RTCSessionDescription) => {
					sendSessionHandler({
						sessionId: attemptId,
						type: "SESSION",
						payload: session,
					});
				},
				sendCandidateCb: (candidate: RTCIceCandidate) => {
					sendCandidateHandler({
						sessionId: attemptId,
						type: "ICE_CANDIDATE",
						payload: candidate,
					});
				}
			});

			this.connections[con.id] = con;
		}

		return con;
	}

	private getAttemptIDFromActiveConnection(con: RTCConnection): RTCConnectionAttemptID | null {
		for (const [k, v] of Object.entries(this.activeConnections)) {
			if (v.id === con.id) return k;
		}

		return null;
	}

	// Returns false if failed to set active - if there's an existing active connection
	private setActiveConnection(con: RTCConnection, sesId: RTCConnectionAttemptID | null = null): RTCConnectionAttemptID | null {
		if (sesId !== null && sesId in this.activeConnections) {
			console.warn("Attempt to set a duplicate active connection ID without completing the previous connection!");
			return null;
		}

		const id = sesId === null ? uuidv4() : sesId;

		this.activeConnections[id] = con;

		// When all candidates gathered, reset state
		const gatheringStateHandler = () => {
			if (con.con.iceGatheringState === "complete") {
				delete this.activeConnections[id];
				con.con.removeEventListener("iceconnectionstatechange", gatheringStateHandler);
			}
		};

		con.con.addEventListener("iceconnectionstatechange", gatheringStateHandler);

		// When active connection completed, reset state
		const connectionStateHandler = () => {
			if (con.con.connectionState === "connected") {
				delete this.activeConnections[id];
			}
		};

		con.con.addEventListener("connectionstatechange", connectionStateHandler);

		return id;
	}

	private addRelayDataChannel(con: RTCConnection, channel: RTCDataChannel | null = null) {
		if (channel === null) {
			channel = con.con.createDataChannel("__rtc-relay");
		}

		this.conRelayChannels[con.id] = channel;

		channel.addEventListener("open", () => {
			console.log("Relay channel open!");

			channel!.send("Hello world!");
		});

		channel.addEventListener("message", (e) => {
			console.log(`Message received: ${e.data}`);
		});
	}

	// Add a completely new peer that isn't connected to any other peer
	// Uses a user-provided method for exchanging sessions and candidates
	async addForeignPeer(
		sendSessionHandler: SendSessionHandler,
		sendCandidateHandler: SendCandidateHandler,
	) {
		const con = this.createNewConnection(sendSessionHandler, sendCandidateHandler);
		this.addRelayDataChannel(con);
	}

	private async handleSessionDesc(
		attemptId: RTCConnectionAttemptID,
		session: RTCSessionDescriptionInit,
		sendSessionHandler: SendSessionHandler,
		sendCandidateHandler: SendCandidateHandler
	) {
		// If the active connection is null, we have received a new connection offer
		if (!(attemptId in this.activeConnections)) {
			if (session.type === "answer") {
				console.warn("Atttempt to handle an answer without an active connection!");
				return;
			}

			// Create a new connection
			const con = this.createNewConnection(sendSessionHandler, sendCandidateHandler, attemptId);

			con.handleSessionDesc(session);

			con.con.addEventListener("datachannel", (e) => {
				const ch = e.channel;

				const relayChannelListener = () => {
					if (ch.label === "__rtc-relay") {
						this.addRelayDataChannel(con, ch);
						ch.removeEventListener("open", relayChannelListener);
					}
				};

				ch.addEventListener("open", relayChannelListener);
			});
		} else {
			await this.activeConnections[attemptId].handleSessionDesc(session);
		}
	}

	private async handleICECandidate(
		attemptId: RTCConnectionAttemptID,
		candidate: RTCIceCandidateInit
	) {
		if (!(attemptId in this.activeConnections)) {
			console.warn("Attempt to add candidate without an active connection");
			return;
		}

		this.activeConnections[attemptId].addIceCandidate(candidate);
	}

	async handleIncomingData(
		data: RTCNetworkConnectionAttemptData,
		sendSessionHandler: SendSessionHandler,
		sendCandidateHandler: SendCandidateHandler
	) {
		switch (data.type) {
			case "SESSION":
				this.handleSessionDesc(data.sessionId, data.payload as RTCSessionDescription, sendSessionHandler, sendCandidateHandler);
				break;
			case "ICE_CANDIDATE":
				this.handleICECandidate(data.sessionId, data.payload as RTCIceCandidate)
				break;
			default:
				console.warn("Attempt to handle data of unknown type!");
		}
	}

	// Add a peer that is connected to another already connected peer
	// Uses the already connected peer as a relay to exchange sessions and candidates with the new peer
	async addNetworkedPeer() {

	}
}