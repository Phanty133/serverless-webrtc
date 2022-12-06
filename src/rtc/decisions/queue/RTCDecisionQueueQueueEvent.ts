import RTCDecisionAttempt from "../decision/RTCDecisionAttempt";

export default class RTCDecisionQueueQueueEvent extends CustomEvent<RTCDecisionAttempt<any>> {
	constructor(attempt: RTCDecisionAttempt<any>) {
		super("queue", { detail: attempt });
	}
}
