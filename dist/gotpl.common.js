'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var jsTokens = require('js-tokens');
var jsTokens__default = _interopDefault(jsTokens);
var isKeyword = _interopDefault(require('is-keyword-js'));
var escapeHTML = _interopDefault(require('escape-html'));

/*!
 * gotpl
 * https://github.com/Lanfei/gotpl
 * @author  Jealous
 * @license MIT
 */

var version = '8.0.0';

// Patterns
var LINE_RE = /\r?\n/g;
var INDENT_RE = /[\r\n]+([\f\t\v]*)/g;

// Rendering caches
var tplCache = {};
var fileCache = {};

/**
 * Default Options
 */
var defOpts = {
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
	var arguments$1 = arguments;

	target = target || {};
	var loop = function ( i, l ) {
		var object = arguments$1[i];
		if (!object) {
			return;
		}
		Object.keys(object).forEach(function (key) {
			target[key] = object[key];
		});
	};

	for (var i = 1, l = arguments.length; i < l; ++i) loop( i, l );
	return target;
}

/**
 * Resolve the template path in CommonJS environment.
 * @param  {string} filename Filename of the template
 * @param  {string} [base]   Base path
 * @return {string}          Absolute path of the template file
 */
function resolvePath(filename, base) {
	var path = require('path');
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
	var compiled = tplCache[template];
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
	var filename = resolvePath(path, options.filename || options.root);
	var compiled = fileCache[filename];
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
	var fs = require('fs');

	if (typeof data === 'function') {
		next = data;
		data = options = null;
	} else if (typeof options === 'function') {
		next = options;
		options = null;
	}

	// Return a promise if callback is not provided
	var promise;
	if (!next) {
		promise = new Promise(function (resolve, reject) {
			next = function (err, data) {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			};
		});
	}

	fs.readFile(path, function (err, buffer) {
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

	var lines = 1;
	var variables = [];
	var debug = options.debug;
	var minify = options.minify;
	var openTag = options.openTag;
	var closeTag = options.closeTag;
	var globalObj = typeof global !== 'undefined' ? global : self;
	var codes = "var $$res = '';\n";

	if (debug) {
		codes = "var $$line;\n" + codes + "try{\n$$line = 1;\t";
	}

	// Parse the template
	template.split(closeTag).forEach(function (segment) {
		var split = segment.split(openTag);
		var html = split[0];
		var logic = split[1];
		if (html) {
			var htmlCode = parseHTML(html);
			if (minify) {
				htmlCode = htmlCode.replace(INDENT_RE, '\\n');
			} else {
				htmlCode = htmlCode.replace(INDENT_RE, '\\n$1');
			}
			codes += htmlCode + ';\n';
			if (debug) {
				lines += html.split(LINE_RE).length - 1;
				codes += "$$line = " + lines + ";\t";
			}
		}
		if (logic) {
			var logicCode;
			if (logic.indexOf('=') === 0) {
				logicCode = parseValue(logic.slice(1), true);
			} else if (logic.indexOf('-') === 0) {
				logicCode = parseValue(logic.slice(1));
			} else {
				logicCode = logic.trim();
			}
			codes += logicCode + '\n';
			logicCode
				.match(jsTokens__default)
				.map(function (keyword) {
					jsTokens__default.lastIndex = 0;
					return jsTokens.matchToToken(jsTokens__default.exec(keyword));
				}).forEach(function (token) {
				var type = token.type;
				var value = token.value;
				if (type === 'name' && !isKeyword(value) && variables.indexOf(value) < 0 && value.slice(0, 2) !== '$$') {
					variables.push(value);
				}
			});
			if (debug) {
				lines += logic.split(LINE_RE).length - 1;
				codes += "$$line = " + lines + ";\t";
			}
		}
	});

	codes += 'return $$res;\n';

	codes = parseVariables(variables) + codes;

	if (debug) {
		codes += '}catch(e){\n$$rethrow(e, $$template, $$line);\n}\n';
	}

	codes = "return function($$data){\n'use strict';\n" + codes + "}";

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
	var codes = '$$data = $$data || {};\n';
	variables.forEach(function (variable) {
		codes += "var " + variable + " = $$data['" + variable + "'] === undefined ? $$global['" + variable + "'] : $$data['" + variable + "'];\n";
	});
	return codes;
}

function rethrow(err, template, line) {
	var lines = template.split(LINE_RE);
	var start = Math.max(line - 3, 0);
	var end = Math.min(lines.length, line + 3);
	err.message += '\n\n' + lines.slice(start, end).map(function (codes, i) {
		var curLine = start + i + 1;
		return (curLine === line ? ' >> ' : '    ') + curLine + '| ' + codes;
	}).join('\n') + '\n';
	throw err;
}

var gotpl = {
	config: config,
	compile: compile,
	render: render,
	renderFile: renderFile,
	renderFileSync: renderFileSync,
	escapeHTML: escapeHTML,
	version: version
};

module.exports = gotpl;
