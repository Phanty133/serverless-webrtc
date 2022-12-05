export namespace ArrayBufferUtils {
	export function buf2hex(buffer: ArrayBuffer) { // buffer is an ArrayBuffer
		return [...new Uint8Array(buffer)]
			.map(x => x.toString(16).padStart(2, '0'))
			.join('');
	}

	export function hex2buf(hex: string) {
		return new Uint8Array(
			hex
				.match(/[\da-f]{2}/gi)!
				.map((h) => parseInt(h, 16))
		);
	}

	export function str2buf(str: string) {
		return (new TextEncoder()).encode(str);
	}
}