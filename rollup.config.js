import buble from 'rollup-plugin-buble';
import replace from 'rollup-plugin-replace';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import pkg from './package.json';

module.exports = [{
	input: 'src/gotpl.js',
	output: {
		file: pkg.main,
		format: 'cjs'
	},
	external: Object.keys(pkg.dependencies),
	plugins: [
		buble(),
		replace({delimiters: ['<%=', '%>'], VERSION: pkg.version})
	]
}, {
	input: 'src/gotpl.js',
	output: {
		file: pkg.module,
		format: 'esm'
	},
	external: Object.keys(pkg.dependencies),
	plugins: [
		replace({delimiters: ['<%=', '%>'], VERSION: pkg.version})
	]
}, {
	input: 'src/gotpl.js',
	output: {
		name: 'gotpl',
		file: pkg.browser,
		format: 'umd'
	},
	plugins: [
		buble(),
		resolve(),
		commonjs(),
		replace({delimiters: ['<%=', '%>'], VERSION: pkg.version, BUILD_ENV: 'browser'})
	]
}];
