import RTCDecisionAttempt from "../decision/RTCDecisionAttempt";

export default class RTCDecisionQueueNextEvent extends CustomEvent<RTCDecisionAttempt<any>> {
	constructor(attempt: RTCDecisionAttempt<any>) {
		super("next", { detail: attempt });
	}
}
