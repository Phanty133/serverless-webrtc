import { NodeId } from "./RTCNetwork";

export default class RTCNetworkPeerEvent extends CustomEvent<NodeId> {
	constructor(id: NodeId) {
		super("peer", { detail: id });
	}
}