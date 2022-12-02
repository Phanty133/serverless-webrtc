import { RelayMessage } from "./RTCManagementChannel";

export default class RTCManagementChannelMessageEvent extends CustomEvent<RelayMessage<any>> {
	constructor(message: RelayMessage<any>) {
		super("message", { detail: message });
	}
}