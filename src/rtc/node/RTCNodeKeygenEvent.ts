export default class RTCNodeKeygenEvent extends CustomEvent<void> {
	constructor() {
		super("keygen");
	}
}
