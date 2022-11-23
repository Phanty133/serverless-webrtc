import { v4 as uuidv4 } from "uuid";
import RTCConnection from "./RTCConnection";

export type SendSessionHandler = (sessionDesc: RTCSessionDescriptionInit) => void;
export type SendCandidateHandler = (candidate: RTCIceCandidateInit) => void;
export type RTCConnectionID = string;

export default class RTCNetwork {
	// Every peer has a UUIDv4 assigned to them when they connect
	connections: Record<RTCConnectionID, RTCConnection> = {};

	// Data channels used for connecting new peers
	conRelayChannels: Record<RTCConnectionID, RTCDataChannel> = {};

	// The connection that was created from an offer and is gathering ICE candidates
	activeConnection: RTCConnection | null = null;

	constructor() {
		
	}

	// Create the connection and set it as the active connection
	private createNewConnection(
		sendSessionHandler: SendSessionHandler,
		sendCandidateHandler: SendCandidateHandler
	): RTCConnection {
		const con = new RTCConnection(uuidv4(), {
			sendSessionCb: sendSessionHandler,
			sendCandidateCb: sendCandidateHandler
		});

		if (this.setActiveConnection(con)) {
			this.connections[con.id] = con;
		}

		return con;
	}

	// Returns false if failed to set active - if there's an existing active connection
	private setActiveConnection(con: RTCConnection): boolean {
		if (this.activeConnection !== null) {
			console.warn("Attempt to set a new active connection without completing the previous connection!");
			return false;
		}

		this.activeConnection = con;

		// When all candidates gathered, reset state
		const gatheringStateHandler = () => {
			if (con.con.iceGatheringState === "complete" && this.activeConnection === con) {
				this.activeConnection = null;
				con.con.removeEventListener("iceconnectionstatechange", gatheringStateHandler);
			}
		};

		con.con.addEventListener("iceconnectionstatechange", gatheringStateHandler);

		// When active connection completed, reset state
		const connectionStateHandler = () => {
			if (con.con.connectionState === "connected" && this.activeConnection === con) {
				this.activeConnection = null;
			}
		};

		con.con.addEventListener("connectionstatechange", connectionStateHandler);

		return true;
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

	async handleSessionDesc(
		session: RTCSessionDescriptionInit,
		sendSessionHandler: SendSessionHandler,
		sendCandidateHandler: SendCandidateHandler
	) {
		// If the active connection is null, we have received a new connection offer
		if (this.activeConnection === null) {
			if (session.type === "answer") {
				console.warn("Atttempt to handle an answer without an active connection!");
				return;	
			}

			// Create a new connection
			const con = this.createNewConnection(sendSessionHandler, sendCandidateHandler);

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
			await this.activeConnection.handleSessionDesc(session);
		}
	}

	async handleICECandidate(candidate: RTCIceCandidateInit) {
		if (this.activeConnection === null) {
			console.warn("Attempt to add candidate without an active connection");
			return;
		}

		this.activeConnection.addIceCandidate(candidate);
	}

	// Add a peer that is connected to another already connected peer
	// Uses the already connected peer as a relay to exchange sessions and candidates with the new peer
	async addNetworkedPeer() {

	}
}