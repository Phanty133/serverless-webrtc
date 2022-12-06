import { ManagementMessage } from "./RTCManagementChannel";

export default class RTCManagementChannelMessageEvent extends CustomEvent<ManagementMessage<any>> {
	constructor(message: ManagementMessage<any>) {
		super("message", { detail: message });
	}
}
