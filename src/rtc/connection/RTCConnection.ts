import CustomEventTarget from "../../events/CustomEventTarget";
import RTCConnectionStateEvent from "./RTCConnectionStateEvent";

export interface RTCConnectionHandlers {
	sendSessionCb: (session: RTCSessionDescription) => void;
	sendCandidateCb: (candidate: RTCIceCandidate) => void;
};

export enum RTCConnectionState {
	NEW,
	CONNECTING,
	CONNECTED,
	BROKEN
};

type RTCConnectionEvents = { "state": RTCConnectionStateEvent };

export default class RTCConnection extends CustomEventTarget<RTCConnectionEvents> {
	readonly con: RTCPeerConnection;

	private handlers: RTCConnectionHandlers;

	private makingOffer = false;

	private _state: RTCConnectionState;

	get state() {
		return this._state;
	}

	constructor(config: RTCConfiguration, handlers: RTCConnectionHandlers) {
		super();

		this._state = RTCConnectionState.NEW;
		this.con = new RTCPeerConnection(config);
		this.handlers = handlers;

		this.initConnection();
	}
	
	private async initConnection() {
		this.con.addEventListener("negotiationneeded", () => { this.onNegotiationNeeded(); });
		this.con.addEventListener("icecandidate", (e) => { this.onIceCandidate(e); });
		this.con.addEventListener("iceconnectionstatechange", () => { this.onIceStateChange(); });
		this.con.addEventListener("connectionstatechange", () => { this.onConnectionStateChange(); });
	}

	private isPolite() {
		return !this.makingOffer;
	}

	private async onNegotiationNeeded() {
		try {
			this.makingOffer = true;
			await this.con.setLocalDescription();

			this.handlers.sendSessionCb(this.con.localDescription!);
		} catch (e) {
			console.error(e);
		} finally {
			this.makingOffer = false;
		}
	}

	private onIceCandidate(e: RTCPeerConnectionIceEvent) {
		if (e.candidate) {
			this.handlers.sendCandidateCb(e.candidate);
		}
	}
	
	private onIceStateChange() {
		if (this.con.iceConnectionState === "failed") {
			this.con.restartIce();
		}
	}

	private onConnectionStateChange() {
		switch (this.con.connectionState) {
			case "connecting":
				this.setState(RTCConnectionState.CONNECTING);
				break;
			case "connected":
				this.setState(RTCConnectionState.CONNECTED);
				break;
			case "failed":
			case "disconnected":
			case "closed":
				this.setState(RTCConnectionState.BROKEN);
				break;
		}
	}

	private setState(newState: RTCConnectionState) {
		this._state = newState;
		this.dispatchEvent(new RTCConnectionStateEvent(this.state));
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
			this.handlers.sendSessionCb(this.con.localDescription!);
		}
	}

	isOpen() {
		return this.con.connectionState === "connected";
	}
}