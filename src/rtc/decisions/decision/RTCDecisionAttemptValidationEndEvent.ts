export default class RTCDecisionAttemptValidationEndEvent extends CustomEvent<{ valid: boolean }> {
	constructor(valid: boolean) {
		super("validationend", { detail: { valid } });
	}
}
