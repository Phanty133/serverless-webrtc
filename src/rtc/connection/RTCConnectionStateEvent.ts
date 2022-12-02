import { RTCConnectionState } from "./RTCConnection";

export default class RTCConnectionStateEvent extends CustomEvent<RTCConnectionState> {
	constructor(state: RTCConnectionState) {
		super("state", { detail: state });
	}
}