// typescript black magic
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
export type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];
export type ValueOf<T> = T[keyof T];

export function valOrDefault<T>(vals: T, defaults: Pick<T, OptionalKeys<T>>): Required<T> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return { ...defaults, ...vals } as Required<T>;
}
