export default class RTCDecisionQueueEmptyEvent extends CustomEvent<void> {
	constructor() {
		super("empty");
	}
}
