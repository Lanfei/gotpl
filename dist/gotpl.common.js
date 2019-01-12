'use strict';

/*!
 * gotpl
 * https://github.com/Lanfei/gotpl
 * @author  Jealous
 * @license MIT
 */

const version = '7.0.1';

// Patterns
const LINE_RE = /\r?\n/g;
const INDENT_RE = /[\r\n]+([\f\t\v]*)/g;
const ESCAPE_RE = /["'&<>]/;
const TYPEOF_RE = /typeof ([$\w]+)/g;

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
	if (typeof options === 'object') {
		merge(defOpts, options);
	} else if (arguments.length === 2) {
		defOpts[arguments[0]] = arguments[1];
	}
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
 * @param   {string} path       Template file path
 * @param   {string} [template] Template source
 * @param   {Object} [data]     Template data
 * @param   {Object} [options]  Rendering options
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

	if (next) {
		fs.readFile(path, (err, buffer) => {
			if (err) {
				next(err);
				return;
			}
			try {
				next(null, renderByPath(path, buffer.toString(), data, options));
			} catch (err) {
				next(err);
			}
		});
	} else {
		return new Promise((resolve, reject) => {
			fs.readFile(path, (err, buffer) => {
				if (err) {
					reject(err);
					return;
				}
				try {
					resolve(renderByPath(path, buffer.toString(), data, options));
				} catch (err) {
					reject(err);
				}
			});
		});
	}

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
	let debug = options.debug;
	let minify = options.minify;
	let openTag = options.openTag;
	let closeTag = options.closeTag;
	let codes = 'return function(__data__){\n\'use strict\'\n';

	if (debug) {
		codes += 'try{var $$line=1,';
	} else {
		codes += 'var ';
	}

	// Parse `typeof`
	template.replace(TYPEOF_RE, (_, $1) => {
		data[$1] = data[$1] || undefined;
	});

	// Extract variables
	Object.keys(data).forEach(key => {
		codes += key + '=__data__[\'' + key + '\'],';
	});

	codes += '$$res=\'\'\n';

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
			codes += htmlCode + '\n';
			if (debug) {
				lines += html.split(LINE_RE).length - 1;
				codes += '$$line=' + lines + ';	';
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
			if (debug) {
				lines += logic.split(LINE_RE).length - 1;
				codes += '$$line=' + lines + ';	';
			}
		}
	});

	codes += 'return $$res';

	if (debug) {
		codes += '\n}catch(e){\n$$rethrow(e, $$template, $$line)\n}\n}';
	} else {
		codes += '\n}';
	}

	function include(path, subData, subOptions) {
		subData = merge({}, data, subData);
		subOptions = merge({}, options, subOptions);
		return renderFileSync(path, subData, subOptions);
	}

	return new Function('$$template, $$escape, $$rethrow, include', codes)(template, escapeHTML, rethrow, include);
}

function parseHTML(codes) {
	return '$$res+=' + JSON.stringify(codes);
}

function parseValue(codes, escape) {
	if (escape) {
		codes = '$$escape(' + codes.trim() + ')';
	}
	return '$$res+=(' + codes + ')';
}

function escapeHTML(value) {
	let html = '' + value;
	let match = ESCAPE_RE.exec(html);
	if (!match) {
		return value;
	}

	let result = '';
	let lastIndex = 0;
	let i = match.index;
	let length = html.length;
	for (; i < length; i++) {
		let charCode = html.charCodeAt(i);
		if (charCode === 34 || charCode === 38 || charCode === 39 || charCode === 60 || charCode === 62) {
			if (lastIndex !== i) {
				result += html.substring(lastIndex, i);
			}
			lastIndex = i + 1;
			result += '&#' + charCode + ';';
		}
	}
	if (lastIndex !== i) {
		result += html.substring(lastIndex, i);
	}
	return result;
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

var gotpl = {
	config,
	render,
	renderFile,
	renderFileSync,
	compile,
	version
};

module.exports = gotpl;
