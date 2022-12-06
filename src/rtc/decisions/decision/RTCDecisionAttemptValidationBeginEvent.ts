export default class RTCDecisionAttemptValidationBeginEvent extends CustomEvent<void> {
	constructor() {
		super("validationbegin");
	}
}
