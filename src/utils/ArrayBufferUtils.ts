export function buf2hex(buffer: ArrayBuffer): string { // buffer is an ArrayBuffer
	return [...new Uint8Array(buffer)]
		.map(x => x.toString(16).padStart(2, "0"))
		.join("");
}

export function hex2buf(hex: string): Uint8Array | null {
	if (hex === "") return new Uint8Array();

	const match = hex.match(/[\da-f]{2}/gi);

	if (match === null) {
		console.warn(`Invalid hex string (${hex})`);
		return null;
	}

	return new Uint8Array(match.map((h) => parseInt(h, 16)));
}

export function str2buf(str: string): Uint8Array {
	return (new TextEncoder()).encode(str);
}
