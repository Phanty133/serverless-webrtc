import { RTCNetworkNodeState } from "./RTCNetworkNode";
import { IPFSID } from "./RTCNode";

export default class RTCNodeIPFSInitEvent extends CustomEvent<IPFSID> {
	constructor(id: IPFSID) {
		super("ipfsinit", { detail: id });
	}
}