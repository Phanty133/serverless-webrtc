import Queue from "../../../datatypes/Queue";
import CustomEventTarget, { CustomEventList } from "../../../events/CustomEventTarget";
import RTCDecision, { DecisionKey } from "../decision/RTCDecision";
import RTCDecisionAttempt from "../decision/RTCDecisionAttempt";
import RTCDecisionQueueQueueEvent from "./RTCDecisionQueueQueueEvent";
import RTCDecisionQueueNextEvent from "./RTCDecisionQueueNextEvent";
import RTCDecisionQueueEmptyEvent from "./RTCDecisionQueueEmptyEvent";

interface RTCDecisionQueueEvents extends CustomEventList {
	"queue": RTCDecisionQueueQueueEvent
	"next": RTCDecisionQueueNextEvent
	"empty": RTCDecisionQueueEmptyEvent
};

export default class RTCDecisionQueue extends CustomEventTarget<RTCDecisionQueueEvents> {
	readonly decisions: Record<DecisionKey, RTCDecision<any>> = {};

	readonly decisionQueue: Queue<RTCDecisionAttempt<any>>;

	private _activeDecisionAttempt: RTCDecisionAttempt<any> | null = null;

	get activeDecisionAttempt(): typeof this._activeDecisionAttempt {
		return this._activeDecisionAttempt;
	}

	constructor() {
		super();
		this.decisionQueue = new Queue();
	}

	// Returns true if executed immediately, false if queued
	queueAttempt<TDecisionData>(attempt: RTCDecisionAttempt<TDecisionData>): boolean {
		this.decisionQueue.add(attempt);

		// Once the attempt has finished validating, set the active attempt to the next one
		attempt.addEventListener("validationend", () => {
			this.nextAttempt();
		});

		this.dispatchEvent<"queue">(new RTCDecisionQueueQueueEvent(attempt));

		if (this.activeDecisionAttempt === null) {
			this.nextAttempt();
			return true;
		} else {
			return false;
		}
	}

	private nextAttempt(): void {
		const next = this.decisionQueue.pop();

		if (next === null) {
			this._activeDecisionAttempt = null;
			this.dispatchEvent<"empty">(new RTCDecisionQueueEmptyEvent());
			return;
		}

		this._activeDecisionAttempt = next;
		this.dispatchEvent<"next">(new RTCDecisionQueueNextEvent(next));
	}
}
