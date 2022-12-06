export default class RTCNodeInitEvent extends CustomEvent<void> {
	constructor() {
		super("init");
	}
}
