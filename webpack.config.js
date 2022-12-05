const path = require("path");
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
	entry: './src/index.ts',
	devtool: 'inline-source-map',
	mode: "development",
	watch: true,
	cache: {
		type: 'filesystem'
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'swc-loader',
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'build'),
	},
	plugins: [
		new NodePolyfillPlugin()
	]
};