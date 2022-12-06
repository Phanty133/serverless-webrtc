import { v4 as uuidv4 } from "uuid";
import CustomEventTarget, { CustomEventList } from "../../../events/CustomEventTarget";
import { NodeId } from "../../network/RTCNetwork";
import { UUIDv4 } from "../../node/RTCNode";
import { DecisionKey } from "./RTCDecision";
import RTCDecisionAttemptValidationEndEvent from "./RTCDecisionAttemptValidationEndEvent";
import RTCDecisionAttemptValidationBeginEvent from "./RTCDecisionAttemptValidationBeginEvent";
import getXXHashInstance from "../../../crypto/xxhash";

export type DecisionID = string;

export interface RTCDecisionAttemptData<TDecisionData> {
	id: DecisionID // UUIDv4 for the decision attempt
	key: DecisionKey
	sourceNode: NodeId
	data: TDecisionData
}

interface RTCDecisionAttemptEvents extends CustomEventList {
	"validationbegin": RTCDecisionAttemptValidationBeginEvent
	"validationend": RTCDecisionAttemptValidationEndEvent
}

export default class RTCDecisionAttempt<TDecisionData> extends CustomEventTarget<RTCDecisionAttemptEvents> {
	readonly id: DecisionID; // UUIDv4 for the decision attempt

	readonly key: DecisionKey;

	readonly sourceNode: NodeId;

	readonly data: TDecisionData;

	private _hash: string | null = null;

	constructor(key: DecisionKey, source: NodeId, data: TDecisionData, id: UUIDv4 | null = null) {
		super();

		this.id = id === null ? uuidv4() : id;
		this.key = key;
		this.sourceNode = source;
		this.data = data;
	}

	export(): RTCDecisionAttemptData<TDecisionData> {
		return {
			id: this.id,
			key: this.key,
			sourceNode: this.sourceNode,
			data: this.data
		};
	}

	static import<TDecisionData>(data: RTCDecisionAttemptData<TDecisionData>): RTCDecisionAttempt<TDecisionData> {
		return new RTCDecisionAttempt(data.key, data.sourceNode, data.data, data.id);
	}

	private async genHash(): Promise<string> {
		const xxhash = await getXXHashInstance();
		const dataStr = JSON.stringify(this.export());
		return xxhash.h64ToString(dataStr);
	}

	async hash(): Promise<string> {
		if (this._hash === null) {
			this._hash = await this.genHash();
		}

		return this._hash;
	}
}
