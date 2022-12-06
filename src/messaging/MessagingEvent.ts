export interface MessageData {
	source: string
	target: string
	label: string
	data: any
}

export default class MessagingEvent extends CustomEvent<MessageData> {
	constructor(data: MessageData) {
		super("message", { detail: data });
	}
}
