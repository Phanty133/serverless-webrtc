export interface RTCConnectionOptions {
	sendSessionCb: (session: RTCSessionDescription) => void;
	sendCandidateCb: (candidate: RTCIceCandidate) => void;
};

export default class RTCConnection {
	static CONN_CONFIG = {
		iceServers: [
			{
				urls: "stun:openrelay.metered.ca:80",
			},
			// {
			// 	urls: "turn:openrelay.metered.ca:80",
			// 	username: "openrelayproject",
			// 	credential: "openrelayproject",
			// },
			// {
			// 	urls: "turn:openrelay.metered.ca:443",
			// 	username: "openrelayproject",
			// 	credential: "openrelayproject",
			// },
			// {
			// 	urls: "turn:openrelay.metered.ca:443?transport=tcp",
			// 	username: "openrelayproject",
			// 	credential: "openrelayproject",
			// },
		]
	};

	con: RTCPeerConnection;

	private makingOffer = false;

	opts: RTCConnectionOptions;

	id: string;

	constructor(id: string, opts?: RTCConnectionOptions) {
		this.id = id;

		if (opts) {
			this.opts = opts;
		} else {
			this.opts = {
				sendSessionCb: () => { console.warn("sendSessionCb not set!"); },
				sendCandidateCb: () => { console.warn("sendCandidateCb not set!"); },
			}
		}

		this.con = new RTCPeerConnection(RTCConnection.CONN_CONFIG);
		this.initConnection();
	}

	private async initConnection() {
		this.con.addEventListener("negotiationneeded", () => { this.onNegotiationNeeded(); });
		this.con.addEventListener("icecandidate", (e) => { this.onIceCandidate(e); });
		this.con.addEventListener("iceconnectionstatechange", () => { this.onIceStateChange(); });
	}

	private isPolite() {
		return !this.makingOffer;
	}

	private async onNegotiationNeeded() {
		try {
			this.makingOffer = true;
			await this.con.setLocalDescription();

			this.opts.sendSessionCb(this.con.localDescription!);
		} catch (e) {
			console.error(e);
		} finally {
			this.makingOffer = false;
		}
	}

	private onIceCandidate(e: RTCPeerConnectionIceEvent) {
		if (e.candidate) {
			this.opts.sendCandidateCb(e.candidate);
		}
	}
	
	private onIceStateChange() {
		if (this.con.iceConnectionState === "failed") {
			this.con.restartIce();
		}
	}

	async addIceCandidate(candidate: RTCIceCandidateInit) {
		if (!this.con) {
			console.warn("Attempt to add ICE candidate to uninitialized connection!");
			return;
		}

		try {
			await this.con.addIceCandidate(candidate);
		} catch (e) {
			console.error("Error adding received ICE candidate", candidate);
		}
	}

	async handleSessionDesc(desc: RTCSessionDescriptionInit) {
		const offerCollision = (desc.type === "offer") && (this.makingOffer || this.con.signalingState !== "stable");
		const ignoreOffer = !this.isPolite() && offerCollision;
		
		if (ignoreOffer) return;

		await this.con.setRemoteDescription(desc);

		if (desc.type === "offer") {
			await this.con.setLocalDescription();

			// Send answer
			this.opts.sendSessionCb(this.con.localDescription!);
		}
	}

	isOpen() {
		return this.con.connectionState === "connected";
	}

	setOptions(opts: RTCConnectionOptions) {
		this.opts = opts;
	}
}