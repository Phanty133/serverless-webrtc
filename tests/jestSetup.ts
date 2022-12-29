import * as crypto from "crypto";
import { TextEncoder, TextDecoder } from "util";

Object.defineProperty(window.self, "crypto", {
	value: Object.setPrototypeOf({ subtle: crypto.webcrypto.subtle }, crypto)
});

Object.defineProperty(global.self, "TextEncoder", {
	value: TextEncoder
});

Object.defineProperty(global.self, "TextDecoder", {
	value: TextDecoder
});
