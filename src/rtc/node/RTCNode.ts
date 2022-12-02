import { v4 as uuidv4 } from "uuid";
import CustomEventTarget from "../../events/CustomEventTarget";
import RTCNetworkNodeStateEvent from "./RTCNetworkNodeStateEvent";

export type UUIDv4 = string;

type RTCNodeEvents = { "state": RTCNetworkNodeStateEvent };

export default class RTCNode extends CustomEventTarget<RTCNodeEvents> {
	private _id: UUIDv4;
	get id() { return this._id; }

	constructor(id: UUIDv4 | null = null) {
		super();
		this._id = id === null ? uuidv4() : id;
	}

	setId(newId: UUIDv4) {
		this._id = newId;
	}
}