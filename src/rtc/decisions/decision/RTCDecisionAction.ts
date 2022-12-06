import { asyncFilter } from "../../../utils/ArrayUtils";
import { NodeId } from "../../network/RTCNetwork";
import RTCDecisionManager from "../RTCDecisionManager";
import { DecisionKey } from "./RTCDecision";
import RTCDecisionAttempt, { RTCDecisionAttemptData } from "./RTCDecisionAttempt";
import RTCDecisionResponse, { RTCDecisionResponseData } from "./RTCDecisionResponse";

export interface RTCDecisionActionData<TDecisionData> {
	key: DecisionKey
	sourceNode: NodeId
	attemptData: RTCDecisionAttemptData<TDecisionData>
	responseData: RTCDecisionResponseData[]
}

export default class RTCDecisionAction<TDecisionData> {
	readonly key: DecisionKey;

	readonly sourceNode: NodeId;

	readonly attempt: RTCDecisionAttempt<TDecisionData>;

	readonly responses: RTCDecisionResponse[];

	constructor(attempt: RTCDecisionAttempt<TDecisionData>, responses: RTCDecisionResponse[]) {
		this.key = attempt.key;
		this.sourceNode = attempt.sourceNode;
		this.attempt = attempt;
		this.responses = responses;
	}

	export(): RTCDecisionActionData<TDecisionData> {
		return {
			key: this.key,
			sourceNode: this.sourceNode,
			attemptData: this.attempt.export(),
			responseData: this.responses.map((r) => r.export())
		};
	}

	static import<TDecisionData>(data: RTCDecisionActionData<TDecisionData>): RTCDecisionAction<TDecisionData> {
		return new RTCDecisionAction(
			RTCDecisionAttempt.import(data.attemptData),
			data.responseData.map((r) => RTCDecisionResponse.import(r))
		);
	}

	async isValid(manager: RTCDecisionManager<any>): Promise<boolean> {
		const attemptHash = await this.attempt.hash();

		// Filter out the responses that have an invalid signature
		const validResponses = await asyncFilter(this.responses, async(r): Promise<boolean> => {
			const node = r.sourceNode === manager.netw.local.id
				? manager.netw.local
				: manager.netw.getNodeById(r.sourceNode);

			if (node === null) {
				console.log(manager.netw);
				console.warn(`Invalid decision response node ID (${r.sourceNode})`);
				return false;
			}

			const respValid = (await r.isValid(node, attemptHash)) === true;

			if (!respValid) {
				console.warn(`Node sus? (${r.sourceNode})`);
			}

			return respValid;
		});

		const consensus = validResponses.filter((r) => r.response).length / this.responses.length;

		return consensus >= manager.targetConsensus;
	}
}
