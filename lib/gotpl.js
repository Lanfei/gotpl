/**
 * gotpl
 * https://github.com/Lanfei/gotpl
 * @author  Jealous
 * @license MIT
 */
(function (global) {
	'use strict';

	var gotpl = {
		config: config,
		render: render,
		renderFile: renderFile,
		renderFileSync: renderFileSync,
		compile: compile,
		version: '6.0.0'
	};

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

	// Node modules
	var fs;
	var path;

	// Environment checking
	var hasDefine = typeof define === 'function';
	var hasExports = typeof module !== 'undefined' && module.exports;

	// Special HTML characters
	var ESCAPE_MAP = {
		'<': '&#60;',
		'>': '&#62;',
		'"': '&#34;',
		"'": '&#39;',
		'&': '&#38;'
	};

	// Patterns
	var LINE_RE = /\r?\n/g;
	var INDENT_RE = /[\r\n]+([\f\t\v]*)/g;
	var ESCAPE_RE = /(['\\])/g;
	var TYPEOF_RE = /typeof ([$\w]+)/g;

	// Rendering caches
	var tplCache = {};
	var fileCache = {};

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
		for (var i = 1, l = arguments.length; i < l; ++i) {
			var object = arguments[i];
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
	 * @param  {String} filename Filename of the template
	 * @param  {String} [base]   Base path
	 * @return {String}          Absolute path of the template file
	 */
	function resolvePath(filename, base) {
		path = path || require('path');
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
	 * @param   {String} template  Template source
	 * @param   {Object} [data]    Template data
	 * @param   {Object} [options] Rendering options
	 * @returns {String}
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
	 * @param   {String} path       Template file path
	 * @param   {String} [template] Template source
	 * @param   {Object} [data]     Template data
	 * @param   {Object} [options]  Rendering options
	 * @returns {String}
	 */
	function renderByPath(path, template, data, options) {
		if (!hasExports) {
			throw new Error('Please use `render` instead in browser environment.');
		}
		options = merge({}, defOpts, options);
		var filename = resolvePath(path, options.filename || options.root);
		var compiled = fileCache[filename];
		if (!compiled) {
			fs = fs || require('fs');
			options.filename = filename;
			template = template || fs.readFileSync(filename).toString();
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
	 * @param {String}          path      Template file path
	 * @param {Object|Function} [data]    Template data
	 * @param {Object|Function} [options] Rendering options
	 * @param {Function}        [next]    Callback
	 */
	function renderFile(path, data, options, next) {
		var args = Array.prototype.slice.call(arguments);
		next = args.pop();
		path = args.shift();
		data = args.shift();
		options = args.shift();

		fs = fs || require('fs');
		fs.readFile(path, function (err, buffer) {
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
	}

	/**
	 * Render the file synchronously.
	 * @param {String} path      Template file path
	 * @param {Object} [data]    Template data
	 * @param {Object} [options] Rendering options
	 */
	function renderFileSync(path, data, options) {
		return renderByPath(path, null, data, options);
	}

	/**
	 * Return the compiled function.
	 * @param {String} template  Template source
	 * @param {Object} [data]    Template data
	 * @param {Object} [options] Rendering options
	 * @return {Function}
	 */
	function compile(template, data, options) {
		data = merge({}, data);
		options = merge({}, defOpts, options);

		var lines = 1;
		var debug = options.debug;
		var minify = options.minify;
		var openTag = options.openTag;
		var closeTag = options.closeTag;
		var codes = 'return function(__data__){\n\'use strict\'\n';

		if (debug) {
			codes += 'try{var $$line=1,';
		} else {
			codes += 'var ';
		}

		// Parse `typeof`
		template.replace(TYPEOF_RE, function (_, $1) {
			data[$1] = data[$1] || undefined;
		});

		// Extract variables
		for (var key in data) {
			codes += key + '=__data__[\'' + key + '\'],';
		}

		codes += '$$res=\'\'\n';

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
				codes += htmlCode + '\n';
				if (debug) {
					lines += html.split(LINE_RE).length - 1;
					codes += '$$line=' + lines + ';	';
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
		return '$$res+=\'' + codes.replace(ESCAPE_RE, '\\$1') + '\'';
	}

	function parseValue(codes, escape) {
		if (escape) {
			codes = '$$escape(' + codes.trim() + ')';
		}
		return '$$res+=(' + codes + ')';
	}

	function escapeChar(char) {
		return ESCAPE_MAP[char];
	}

	function escapeHTML(value) {
		return (value + '').replace(/&(?![\w#]+;)|[<>"']/g, escapeChar);
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

	// Expose
	if (hasExports) {
		module.exports = gotpl;
	} else if (hasDefine) {
		define(gotpl);
	} else {
		global.gotpl = gotpl;
	}

})(this);
