import CustomEventTarget, { CustomEventList } from "../../../events/CustomEventTarget";
import * as ObjectUtils from "../../../utils/ObjectUtils";
import RTCNetwork, { NodeId } from "../../network/RTCNetwork";
import RTCDecisionAttempt, { DecisionID } from "./RTCDecisionAttempt";
import RTCDecisionAttemptValidationEndEvent from "./RTCDecisionAttemptValidationEndEvent";
import RTCDecisionAttemptValidationBeginEvent from "./RTCDecisionAttemptValidationBeginEvent";
import RTCDecisionResponse from "./RTCDecisionResponse";

export type DecisionKey = string;
export type RTCDecisionDataType<C extends RTCDecision<any>> = C extends RTCDecision<infer T> ? T : unknown;

export interface RTCDecisionOpts<TDecisionData> {
	key: DecisionKey
	netw: RTCNetwork
	acceptHandler: (decisionData: TDecisionData) => Promise<void> // Executed when the decision is accepted
	declineHandler: (attemptID: DecisionID) => Promise<void> // Executed when the decision is declined
	validityHandler: (decisionData: TDecisionData) => Promise<boolean> // Executed when checking whether another peer can do a decision
	decisionHandler?: ((decisionData: TDecisionData, node: NodeId) => Promise<void>) | null // Executed when a foreign decision is successful. If null, just executes acceptHandler
	timeout?: number | null // Milliseconds until the decision we requested times out and is considered false
}

interface RTCDecisionEvents extends CustomEventList {

}

export default class RTCDecision<TDecisionData> extends CustomEventTarget<RTCDecisionEvents> {
	readonly opts: Required<RTCDecisionOpts<TDecisionData>>;

	constructor(opts: RTCDecisionOpts<TDecisionData>) {
		super();

		this.opts = ObjectUtils.valOrDefault(opts, {
			decisionHandler: null,
			timeout: null
		});
	}

	generateAttempt(key: DecisionKey, data: TDecisionData): RTCDecisionAttempt<TDecisionData> {
		return new RTCDecisionAttempt(key, this.opts.netw.local.id, data);
	}

	async validateAttempt(attempt: RTCDecisionAttempt<TDecisionData>): Promise<RTCDecisionResponse | null> {
		if (attempt.key !== this.opts.key) {
			console.warn(`Invalid attempt! (Attempt: ${attempt.key}, Decision: ${this.opts.key})`);
			return null;
		}

		attempt.dispatchEvent<"validationbegin">(new RTCDecisionAttemptValidationBeginEvent());

		const isValid = await this.opts.validityHandler(attempt.data);
		const resp = new RTCDecisionResponse(this.opts.netw.local.id, this.opts.key, attempt.id, isValid);

		if (isValid) await resp.sign(this.opts.netw.local, attempt);

		attempt.dispatchEvent<"validated">(new RTCDecisionAttemptValidationEndEvent(isValid));

		return resp;
	}

	async localExec(data: TDecisionData): Promise<void> {
		await this.opts.acceptHandler(data);
	}

	async foreignExec(data: TDecisionData, node: NodeId): Promise<void> {
		if (this.opts.decisionHandler === null) {
			await this.opts.acceptHandler(data);
		} else {
			await this.opts.decisionHandler(data, node);
		}
	}
};
