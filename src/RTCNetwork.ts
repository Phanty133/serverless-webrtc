import { v4 as uuidv4 } from "uuid";
import RTCConnection from "./RTCConnection";

export type ReceiveSessionHandler = () => Promise<RTCSessionDescriptionInit>;
export type ReceiveCandidateHandler = () => Promise<RTCIceCandidateInit[]>;
export type SendSessionHandler = (sessionDesc: RTCSessionDescriptionInit) => void;
export type SendCandidateHandler = (candidate: RTCIceCandidateInit) => void;
export type RTCConnectionID = string;

export default class RTCNetwork {
	// Every peer has a UUIDv4 assigned to them when they connect
	connections: Record<RTCConnectionID, RTCConnection> = {};

	// Data channels used for connecting new peers
	conRelayChannels: Record<RTCConnectionID, RTCDataChannel> = {};

	constructor() {
		
	}

	// Add a completely new peer that isn't connected to any other peer
	// Uses a user-provided method for exchanging sessions and candidates
	async addForeignPeer(
		receiveSessionHandler: ReceiveSessionHandler,
		receiveCandidateHandler: ReceiveCandidateHandler,
		sendSessionHandler: SendSessionHandler,
		sendCandidateHandler: SendCandidateHandler
	) {
		const con = new RTCConnection({
			sendSessionCb: sendSessionHandler,
			sendCandidateCb: sendCandidateHandler
		});
		const id = uuidv4();
		const ch = con.con.createDataChannel("__rtc-relay");

		const answer = await receiveSessionHandler();
		const candidates = await receiveCandidateHandler();

		con.handleSessionDesc(answer);
		
		for (const c of candidates) {
			con.addIceCandidate(c);
		}

		ch.addEventListener("open", () => {
			console.log("channel open");
		});

		this.connections[id] = con;
		this.conRelayChannels[id] = ch;
	}

	// Add a peer that is connected to another already connected peer
	// Uses the already connected peer as a relay to exchange sessions and candidates with the new peer
	async addNetworkedPeer() {

	}
}