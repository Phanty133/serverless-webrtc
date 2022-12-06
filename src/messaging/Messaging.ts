import MessagingEvent, { MessageData } from "./MessagingEvent";

export default class Messaging extends EventTarget {
	id: string;

	constructor(id: string) {
		super();
		this.id = id;

		this.initListener();
	}

	private initListener(): void {
		window.addEventListener("message", (e) => {
			let data: MessageData;

			try {
				data = JSON.parse(e.data);
			} catch {
				console.warn("Received invalid message JSON!");
				return;
			}

			if (data.target !== this.id) return;

			this.dispatchEvent(new MessagingEvent(data));
		});
	}

	send(target: string, data: any): void {
		if (window.top === null) return;

		window.top.postMessage(JSON.stringify({
			source: this.id,
			target,
			data
		}), "*");
	}
}
