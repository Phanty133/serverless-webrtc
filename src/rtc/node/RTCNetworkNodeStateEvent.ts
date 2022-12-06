import { RTCNetworkNodeState } from "./RTCNetworkNode";

export default class RTCNetworkNodeStateEvent extends CustomEvent<RTCNetworkNodeState> {
	constructor(state: RTCNetworkNodeState) {
		super("state", { detail: state });
	}
}
