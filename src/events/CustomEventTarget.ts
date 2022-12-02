export default class CustomEventTarget<TEvents extends Record<string, CustomEvent>> extends EventTarget {
	constructor() {
		super();
	}

	addEventListener<TEvent extends keyof TEvents>(
		type: TEvent,
		callback: ((event: TEvents[TEvent]) => void) | { handleEvent(object: TEvents[TEvent]): void; } | null,
		options?: boolean | AddEventListenerOptions | undefined
	): void {
		super.addEventListener(type as string, callback as EventListenerOrEventListenerObject | null, options);
	}

	dispatchEvent<TEvent extends keyof TEvents>(event: TEvents[TEvent]): boolean {
		return super.dispatchEvent(event);
	}
}