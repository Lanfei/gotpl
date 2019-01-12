import buble from 'rollup-plugin-buble';
import replace from 'rollup-plugin-replace';
import pkg from './package.json';

const bublePlugin = buble();
const replacePlugin = replace({VERSION: pkg.version});

module.exports = [{
	input: 'src/gotpl.js',
	output: {
		file: 'dist/gotpl.common.js',
		format: 'cjs'
	},
	plugins: [
		replacePlugin
	]
}, {
	input: 'src/gotpl.js',
	output: {
		name: 'gotpl',
		file: 'dist/gotpl.js',
		format: 'umd'
	},
	plugins: [
		bublePlugin,
		replacePlugin
	]
}];
