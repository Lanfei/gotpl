import jsTokens, { matchToToken } from 'js-tokens';
import isKeyword from 'is-keyword-js';
import escapeHTML from 'escape-html';

/*!
 * gotpl
 * https://github.com/Lanfei/gotpl
 * @author  Jealous
 * @license MIT
 */

const version = '8.4.1';

// Patterns
const LINE_RE = /\r?\n/g;
const INDENT_RE = /(^|\r|\n)+\s+/g;

// Rendering caches
const cache = {};

/**
 * Default Options
 */
let defOpts = {
	/** The root of template files */
	root: '',
	/** Rendering context, defaults to `global` in node, `window` in browser */
	scope: global,
	/** Enable debug information output, defaults to `false` */
	debug: false,
	/** Enable caching, defaults to `true` */
	cache: true,
	/** Minify indents, defaults to `true` */
	minify: true,
	/** Open tag, defaults to `<%` */
	openTag: '<%',
	/** Close tag, defaults to `%>` */
	closeTag: '%>'
};

/**
 * Update the default options.
 * @param  {Object} [options] The properties to merge in default options
 * @return {Object}           Latest default options
 */
function config(options) {
	if (options) {
		merge(defOpts, options);
	}
	return defOpts;
}

/**
 * Merge giving objects into the first object.
 * @param  {Object}    target  The object to merge
 * @param  {...Object} objects Additional objects to merge
 * @return {Object}            The merged object
 */
function merge(target, /*...*/objects) {
	for (let i = 1, l = arguments.length; i < l; ++i) {
		let object = arguments[i];
		if (!object) {
			continue;
		}
		Object.keys(object).forEach(function (key) {
			target[key] = object[key];
		});
	}
	return target;
}

/**
 * Resolve the template path in CommonJS environment.
 * @param  {string} filename Filename of the template
 * @param  {string} [base]   Base path
 * @return {string}          Absolute path of the template file
 */
function resolvePath(filename, base) {
	const path = require('path');
	if (!path.isAbsolute(filename)) {
		if (base) {
			base = path.resolve(base);
		} else {
			base = path.resolve(defOpts.root);
		}
		if (path.extname(base)) {
			base = path.dirname(base);
		}
		filename = path.join(base, filename);
	}
	if (!path.extname(filename)) {
		filename += '.tpl';
	}
	return filename;
}

/**
 * Render the giving template.
 * @param   {string} template  Template source
 * @param   {Object} [data]    Template data
 * @param   {Object} [options] Rendering options
 * @returns {string}
 */
function render(template, data, options) {
	options = merge({}, defOpts, options);
	return compile(template, options)(data);
}

/**
 * Render the giving path or template.
 * @param   {string}      path       Template file path
 * @param   {string|null} [template] Template source
 * @param   {Object}      [data]     Template data
 * @param   {Object}      [options]  Rendering options
 * @returns {string}
 */
function renderByPath(path, template, data, options) {
	options = merge({}, defOpts, options);
	let filename = resolvePath(path, options.parent || options.root);
	let compiled = cache[filename];
	if (!compiled) {
		options.parent = filename;
		template = template || require('fs').readFileSync(filename).toString();
		compiled = compile(template, options);
		// Cache the compiled function
		if (options.cache && !options.debug) {
			cache[filename] = compiled;
		}
	}
	try {
		return compiled(data);
	} catch (e) {
		// Remove the cache if an error is caught
		cache[filename] = null;
		throw e;
	}
}

/**
 * Render the file asynchronously.
 * @param  {string}          path        Template file path
 * @param  {Object|Function} [data]      Template data
 * @param  {Object|Function} [options]   Rendering options
 * @param  {Function}        [callback]  Callback
 * @return {Promise|void}                Return a promise if callback is not provided
 */
function renderFile(path, data, options, callback) {
	const fs = require('fs');

	if (typeof data === 'function') {
		callback = data;
		data = options = null;
	} else if (typeof options === 'function') {
		callback = options;
		options = null;
	}

	// Return a promise if callback is not provided
	let promise;
	let filename = resolvePath(path, options ? options.root : null);
	if (!callback) {
		promise = new Promise((resolve, reject) => {
			callback = (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			};
		});
	}

	fs.readFile(filename, (err, buffer) => {
		if (err) {
			callback(err);
			return;
		}
		try {
			callback(null, renderByPath(filename, buffer.toString(), data, options));
		} catch (err) {
			callback(err);
		}
	});

	return promise;
}

/**
 * Render the file synchronously.
 * @param {string} path      Template file path
 * @param {Object} [data]    Template data
 * @param {Object} [options] Rendering options
 */
function renderFileSync(path, data, options) {
	return renderByPath(path, null, data, options);
}

/**
 * Return the compiled function.
 * @param {string} template  Template source
 * @param {Object} [options] Rendering options
 * @return {Function}
 */
function compile(template, options) {
	options = merge({}, defOpts, options);

	let lines = 1;
	let variables = [];
	let scope = options.scope;
	let debug = options.debug;
	let minify = options.minify;
	let openTag = options.openTag;
	let closeTag = options.closeTag;
	let codes = `var $$res = '';\n`;

	if (debug) {
		codes = `var $$line;\n${codes}try{\n$$line = 1;\t`;
	}

	// Parse the template
	template.split(closeTag).forEach(segment => {
		let split = segment.split(openTag);
		let html = split[0];
		let logic = split[1];
		if (html) {
			let htmlCode;
			if (minify) {
				htmlCode = html.replace(INDENT_RE, '$1');
			} else {
				htmlCode = html;
			}
			htmlCode = parseHTML(htmlCode);
			codes += htmlCode + ';\n';
			if (debug) {
				lines += html.split(LINE_RE).length - 1;
				codes += `$$line = ${lines};\t`;
			}
		}
		if (logic) {
			let logicCode;
			if (logic.indexOf('=') === 0) {
				logic = logic.slice(1);
				logicCode = parseValue(logic, true);
			} else if (logic.indexOf('-') === 0) {
				logic = logic.slice(1);
				logicCode = parseValue(logic);
			} else {
				logicCode = logic.trim();
			}
			codes += logicCode + '\n';
			variables = getVariables(logic, variables);
			if (debug) {
				lines += logic.split(LINE_RE).length - 1;
				codes += `$$line = ${lines};\t`;
			}
		}
	});

	codes += 'return $$res;\n';

	codes = parseVariables(variables) + codes;

	if (debug) {
		codes += '}catch(e){\n$$rethrow(e, $$template, $$line);\n}\n';
	}

	codes = `return function($$data){\n'use strict';\n${codes}}`;

	function include(path, data) {
		return renderFileSync(path, data, options);
	}

	return new Function('$$scope', '$$template, $$merge, $$escape, $$include, $$rethrow', codes)(scope, template, merge, escapeHTML, include, rethrow);
}

function parseHTML(codes) {
	return '$$res += ' + JSON.stringify(codes);
}

function parseValue(codes, escape) {
	if (escape) {
		return '$$res += $$escape(' + codes.trim() + ')';
	} else {
		return '$$res += (' + codes + ')';
	}
}

function getVariables(codes, variables) {
	let ignore = false;
	codes
		.match(jsTokens)
		.map(keyword => {
			jsTokens.lastIndex = 0;
			return matchToToken(jsTokens.exec(keyword));
		})
		.forEach(token => {
			let type = token.type;
			let value = token.value;
			if (!ignore && type === 'name' && !isKeyword(value) && variables.indexOf(value) < 0) {
				variables.push(value);
			}
			ignore = type === 'punctuator' && value === '.';
		});
	return variables;
}

function parseVariables(variables) {
	let codes = '$$data = $$data || {};\n$$data.__proto__ = $$scope;\n';
	variables.forEach(variable => {
		if (variable === 'include') {
			codes += 'var include = function (path, data) {return $$include(path, $$merge({}, $$data, data));};\n';
		} else {
			codes += `var ${variable} = $$data['${variable}'];\n`;
		}
	});
	return codes;
}

function rethrow(err, template, line) {
	let lines = template.split(LINE_RE);
	let start = Math.max(line - 3, 0);
	let end = Math.min(lines.length, line + 3);
	err.line = line;
	err.message += '\n\n' + lines.slice(start, end).map((codes, i) => {
		let curLine = start + i + 1;
		return (curLine === line ? ' >> ' : '    ') + curLine + '| ' + codes;
	}).join('\n') + '\n';
	throw err;
}

var gotpl = {
	config,
	compile,
	render,
	renderFile,
	renderFileSync,
	escapeHTML,
	version
};

export default gotpl;
