/*!
 * gotpl
 * https://github.com/Lanfei/gotpl
 * @author  Jealous
 * @license MIT
 */
'use strict';
import jsTokens, {matchToToken} from 'js-tokens';
import isKeyword from 'is-keyword-js';
import escapeHTML from 'escape-html';

const version = 'VERSION';

// Patterns
const LINE_RE = /\r?\n/g;
const INDENT_RE = /[\r\n]+([\f\t\v]*)/g;

// Rendering caches
const tplCache = {};
const fileCache = {};

/**
 * Default Options
 */
let defOpts = {
	/** The root of template files */
	root: '',
	/** Enable debug information output, defaults to `false` */
	debug: false,
	/** Enable caching, defaults to `true` */
	cache: true,
	/** Minify indents, defaults to `true` */
	minify: true,
	/** Open tag, defaults to "<%" */
	openTag: '<%',
	/** Close tag, defaults to "%>" */
	closeTag: '%>'
};

/**
 * The configure function.
 * @param {Object} options The properties to merge in default options
 */
function config(options) {
	merge(defOpts, options);
}

/**
 * Merge giving objects into first object.
 * @param  {Object}    target  The object to merge in
 * @param  {...Object} objects Additional objects to merge in
 * @return {Object}
 */
function merge(target, /*...*/objects) {
	target = target || {};
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
			base = defOpts.root;
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
	let compiled = tplCache[template];
	if (!compiled) {
		options = merge({}, defOpts, options);
		compiled = compile(template, data, options);
		// Cache the compiled function
		if (options.cache && !options.debug) {
			tplCache[template] = compiled;
		}
	}
	try {
		return compiled(data);
	} catch (e) {
		// Remove the cache if an error is caught
		tplCache[template] = null;
		throw e;
	}
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
	let filename = resolvePath(path, options.filename || options.root);
	let compiled = fileCache[filename];
	if (!compiled) {
		options.filename = filename;
		template = template || require('fs').readFileSync(filename).toString();
		compiled = compile(template, data, options);
		// Cache the compiled function
		if (options.cache && !options.debug) {
			fileCache[filename] = compiled;
		}
	}
	try {
		return compiled(data);
	} catch (e) {
		// Remove the cache if an error is caught
		fileCache[filename] = null;
		throw e;
	}
}

/**
 * Render the file asynchronously.
 * @param  {string}          path      Template file path
 * @param  {Object|Function} [data]    Template data
 * @param  {Object|Function} [options] Rendering options
 * @param  {Function}        [next]    Callback
 * @return {Promise|void}              Return a promise if callback is not provided
 */
function renderFile(path, data, options, next) {
	const fs = require('fs');

	if (typeof data === 'function') {
		next = data;
		data = options = null;
	} else if (typeof options === 'function') {
		next = options;
		options = null;
	}

	// Return a promise if callback is not provided
	let promise;
	if (!next) {
		promise = new Promise((resolve, reject) => {
			next = (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			};
		});
	}

	fs.readFile(path, (err, buffer) => {
		if (err) {
			next(err);
		} else {
			try {
				next(null, renderByPath(path, buffer.toString(), data, options));
			} catch (err) {
				next(err);
			}
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
 * @param {Object} [data]    Template data
 * @param {Object} [options] Rendering options
 * @return {Function}
 */
function compile(template, data, options) {
	data = merge({}, data);
	options = merge({}, defOpts, options);

	let lines = 1;
	let variables = [];
	let debug = options.debug;
	let minify = options.minify;
	let openTag = options.openTag;
	let closeTag = options.closeTag;
	let globalObj = typeof global !== 'undefined' ? global : self;
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
			let htmlCode = parseHTML(html);
			if (minify) {
				htmlCode = htmlCode.replace(INDENT_RE, '\\n');
			} else {
				htmlCode = htmlCode.replace(INDENT_RE, '\\n$1');
			}
			codes += htmlCode + ';\n';
			if (debug) {
				lines += html.split(LINE_RE).length - 1;
				codes += `$$line = ${lines};\t`;
			}
		}
		if (logic) {
			let logicCode;
			if (logic.indexOf('=') === 0) {
				logicCode = parseValue(logic.slice(1), true);
			} else if (logic.indexOf('-') === 0) {
				logicCode = parseValue(logic.slice(1));
			} else {
				logicCode = logic.trim();
			}
			codes += logicCode + '\n';
			logicCode
				.match(jsTokens)
				.map(keyword => {
					jsTokens.lastIndex = 0;
					return matchToToken(jsTokens.exec(keyword));
				}).forEach(token => {
				let type = token.type;
				let value = token.value;
				if (type === 'name' && !isKeyword(value) && variables.indexOf(value) < 0 && value.slice(0, 2) !== '$$') {
					variables.push(value);
				}
			});
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

	function include(path, subData, subOptions) {
		subData = merge({}, data, subData);
		subOptions = merge({}, options, subOptions);
		return renderFileSync(path, subData, subOptions);
	}

	return new Function('$$global', '$$template, $$escape, $$rethrow, include', codes)(globalObj, template, escapeHTML, rethrow, include);
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

function parseVariables(variables) {
	let codes = '$$data = $$data || {};\n';
	variables.forEach(variable => {
		codes += `var ${variable} = $$data['${variable}'] === undefined ? $$global['${variable}'] : $$data['${variable}'];\n`;
	});
	return codes;
}

function rethrow(err, template, line) {
	let lines = template.split(LINE_RE);
	let start = Math.max(line - 3, 0);
	let end = Math.min(lines.length, line + 3);
	err.message += '\n\n' + lines.slice(start, end).map((codes, i) => {
		let curLine = start + i + 1;
		return (curLine === line ? ' >> ' : '    ') + curLine + '| ' + codes;
	}).join('\n') + '\n';
	throw err;
}

export default {
	config,
	compile,
	render,
	renderFile,
	renderFileSync,
	escapeHTML,
	version
};
