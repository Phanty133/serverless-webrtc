import { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	roots: ["tests"],
	collectCoverage: true,
	setupFilesAfterEnv: ["./tests/jestSetup.ts"]
};

export default config;
