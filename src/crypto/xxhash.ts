import xxhash, { XXHashAPI } from "xxhash-wasm";

let xxhashInstance: XXHashAPI | null = null;

export default async function getXXHashInstance(): Promise<XXHashAPI> {
	if (xxhashInstance === null) {
		xxhashInstance = await xxhash();
	}

	return xxhashInstance;
}
