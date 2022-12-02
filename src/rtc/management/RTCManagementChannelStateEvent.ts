import { RTCManagementChannelState } from "./RTCManagementChannel";

export default class RTCManagementChannelStateEvent extends CustomEvent<RTCManagementChannelState> {
	constructor(state: RTCManagementChannelState) {
		super("state", { detail: state });
	}
}