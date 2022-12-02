import { v4 as uuidv4 } from "uuid";
import CustomEventTarget from "../../events/CustomEventTarget";
import RTCNetworkNodeStateEvent from "./RTCNetworkNodeStateEvent";

export type UUIDv4 = string;

type RTCNodeEvents = { "state": RTCNetworkNodeStateEvent };

export default class RTCNode extends CustomEventTarget<RTCNodeEvents> {
	id: UUIDv4;

	constructor(id: UUIDv4 | null = null) {
		super();
		this.id = id === null ? uuidv4() : id;
	}
}