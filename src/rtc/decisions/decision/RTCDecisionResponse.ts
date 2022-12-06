import { NodeId } from "../../network/RTCNetwork";
import RTCNode from "../../node/RTCNode";
import { DecisionKey } from "./RTCDecision";
import RTCDecisionAttempt, { DecisionID } from "./RTCDecisionAttempt";

export interface RTCDecisionResponseData {
	id: DecisionID
	key: DecisionKey
	response: boolean
	signature: string | null
	sourceNode: NodeId
}

export default class RTCDecisionResponse {
	readonly id: DecisionID;

	readonly key: DecisionKey;

	readonly response: boolean;

	readonly sourceNode: NodeId;

	private signature: string | null;

	constructor(sourceNode: NodeId, key: DecisionKey, id: DecisionID, response: boolean, signature: string | null = null) {
		this.sourceNode = sourceNode;
		this.id = id;
		this.key = key;
		this.response = response;
		this.signature = signature;
	}

	async sign(localNode: RTCNode, attempt: RTCDecisionAttempt<any>): Promise<void> {
		const dataHash = await attempt.hash();
		this.signature = await localNode.sign(dataHash);
	}

	export(): RTCDecisionResponseData {
		return {
			id: this.id,
			sourceNode: this.sourceNode,
			key: this.key,
			response: this.response,
			signature: this.signature
		};
	}

	static import(data: RTCDecisionResponseData): RTCDecisionResponse {
		return new RTCDecisionResponse(data.sourceNode, data.key, data.id, data.response, data.signature);
	}

	// Checks if the signature is valid
	async isValid(node: RTCNode, attemptHash: string): Promise<boolean | null> {
		if (this.signature === null) return true;

		return await node.verify(this.signature, attemptHash);
	}
}
