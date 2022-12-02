export default class CustomEventTarget<TEvents extends Record<string, CustomEvent>> extends EventTarget {
	constructor() {
		super();
	}

	addEventListener(
		type: keyof TEvents,
		callback: ((event: TEvents[keyof TEvents]) => void) | { handleEvent(object: TEvents[keyof TEvents]): void; } | null,
		options?: boolean | AddEventListenerOptions | undefined
	): void {
		super.addEventListener(type as string, callback as EventListenerOrEventListenerObject | null, options);
	}

	dispatchEvent(event: TEvents[keyof TEvents]): boolean {
		return super.dispatchEvent(event);
	}
}