import buble from 'rollup-plugin-buble';
import replace from 'rollup-plugin-replace';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import pkg from './package.json';

const bublePlugin = buble();
const resolvePlugin = resolve();
const commonjsPlugin = commonjs();
const replacePlugin = replace({VERSION: pkg.version});

module.exports = [{
	input: 'src/gotpl.js',
	output: {
		file: 'dist/gotpl.common.js',
		format: 'cjs'
	},
	plugins: [
		bublePlugin,
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
		resolvePlugin,
		replacePlugin,
		commonjsPlugin
	]
}];
