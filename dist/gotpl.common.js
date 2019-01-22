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

var version = '8.3.0';

// Patterns
var LINE_RE = /\r?\n/g;
var INDENT_RE = /(^|\r|\n)+\s+/g;

// Rendering caches
var cache = {};

/**
 * Default Options
 */
var defOpts = {
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
	var arguments$1 = arguments;

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
	var filename = resolvePath(path, options.parent || options.root);
	var compiled = cache[filename];
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
	var fs = require('fs');

	if (typeof data === 'function') {
		callback = data;
		data = options = null;
	} else if (typeof options === 'function') {
		callback = options;
		options = null;
	}

	// Return a promise if callback is not provided
	var promise;
	var filename = resolvePath(path, options ? options.root : null);
	if (!callback) {
		promise = new Promise(function (resolve, reject) {
			callback = function (err, data) {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			};
		});
	}

	fs.readFile(filename, function (err, buffer) {
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

	var lines = 1;
	var variables = [];
	var scope = options.scope;
	var debug = options.debug;
	var minify = options.minify;
	var openTag = options.openTag;
	var closeTag = options.closeTag;
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
			var htmlCode;
			if (minify) {
				htmlCode = html.replace(INDENT_RE, '');
			} else {
				htmlCode = html;
			}
			htmlCode = parseHTML(htmlCode);
			codes += htmlCode + ';\n';
			if (debug) {
				lines += html.split(LINE_RE).length - 1;
				codes += "$$line = " + lines + ";\t";
			}
		}
		if (logic) {
			var logicCode;
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
	var ignore = false;
	codes
		.match(jsTokens__default)
		.map(function (keyword) {
			jsTokens__default.lastIndex = 0;
			return jsTokens.matchToToken(jsTokens__default.exec(keyword));
		})
		.forEach(function (token) {
			var type = token.type;
			var value = token.value;
			if (!ignore && type === 'name' && !isKeyword(value) && variables.indexOf(value) < 0) {
				variables.push(value);
			}
			ignore = type === 'punctuator' && value === '.';
		});
	return variables;
}

function parseVariables(variables) {
	var codes = '$$data = $$data || {};\n$$data.__proto__ = $$scope;\n';
	variables.forEach(function (variable) {
		if (variable === 'include') {
			codes += 'var include = function (path, data) {return $$include(path, $$merge({}, $$data, data));};\n';
		} else {
			codes += "var " + variable + " = $$data['" + variable + "'];\n";
		}
	});
	return codes;
}

function rethrow(err, template, line) {
	var lines = template.split(LINE_RE);
	var start = Math.max(line - 3, 0);
	var end = Math.min(lines.length, line + 3);
	err.line = line;
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
