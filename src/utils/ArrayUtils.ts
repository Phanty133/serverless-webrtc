export async function asyncFilter<T>(
	arr: T[],
	predicate: (value: T) => Promise<boolean>,
	continueOnError = false,
	errorCatch: (reason: any) => void = () => {}
): Promise<T[] | null> {
	const promiseArr = arr.map(predicate);

	if (continueOnError) {
		for (const p of promiseArr) {
			p.catch(errorCatch);
		}

		const results = (await Promise.allSettled(promiseArr))
			.map((v) => v.status === "fulfilled" && v.value);

		return arr.filter((_v, index) => results[index]);
	} else {
		try {
			const results = await Promise.all(promiseArr);
			return arr.filter((_v, index) => results[index]);
		} catch (e) {
			errorCatch(e);
			return null;
		}
	}
}
