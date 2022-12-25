import { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["tests"],
	collectCoverage: true
};

export default config;
