export default class RTCNetworkInitEvent extends CustomEvent<void> {
	constructor() {
		super("init");
	}
}
