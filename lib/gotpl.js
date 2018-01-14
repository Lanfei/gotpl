/*!
 * GoTpl 5.0.0
 * https://github.com/Lanfei/GoTpl
 * A lightweight, high-performance JavaScript template engine.
 */
(function (global) {
	var gotpl = {
		config: config,
		render: render,
		renderFile: renderFile,
		renderFileSync: renderFileSync,
		compile: compile,
		version: '5.0.0'
	};

	/**
	 * Default Options
	 */
	var defOpts = {
		/** The root of template files */
		root: '',
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
	var fs, path;

	// Environment checking
	var hasDefine = typeof define === 'function',
		hasExports = typeof module !== 'undefined' && module.exports;

	// Special HTML characters
	var ESCAPE_MAP = {
		'<': '&#60;',
		'>': '&#62;',
		'"': '&#34;',
		"'": '&#39;',
		'&': '&#38;'
	};

	// Patterns
	var LINE_RE = /\r?\n/g,
		INDENT_RE = /[\r\n]+([\f\t\v]*)/g,
		ESCAPE_RE = /(['\\])/g,
		TYPEOF_RE = /typeof ([$\w]+)/g;

	// Rendering caches
	var tplCache = {},
		fileCache = {};

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
			for (var key in object) {
				target[key] = object[key];
			}
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
			if (options.cache) {
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
			if (options.cache) {
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
			} else {
				try {
					next(null, renderByPath(path, buffer.toString(), data, options));
				} catch (err) {
					next(err);
				}
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
		var codes, debug, minify, openTag, closeTag;
		data = merge({}, data);
		options = merge({}, defOpts, options);
		debug = options.debug;
		minify = options.minify;
		openTag = options.openTag;
		closeTag = options.closeTag;

		if (debug) {
			codes = 'try{var ';
		} else {
			codes = 'var ';
		}

		// Parse `typeof`
		template.replace(TYPEOF_RE, function (_, $1) {
			data[$1] = data[$1] || undefined;
		});

		// Extract variables
		for (var key in data) {
			codes += key + '=__data__[\'' + key + '\'],';
		}

		codes += '__ret__=\'\',__line__=1;';

		// Parse the template
		template.split(closeTag).forEach(function (segment) {
			var split = segment.split(openTag),
				html = split[0],
				logic = split[1];
			if (html) {
				var htmlCode = parseHTML(html);
				if (minify) {
					htmlCode = htmlCode.replace(INDENT_RE, '\\n');
				} else {
					htmlCode = htmlCode.replace(INDENT_RE, '\\n$1');
				}
				codes += htmlCode;
			}
			if (debug) {
				codes += '__line__+=' + (html.split(LINE_RE).length - 1) + ';';
			}
			if (logic) {
				if (logic.indexOf('=') === 0) {
					codes += parseValue(logic.slice(1), true);
				} else if (logic.indexOf('-') === 0) {
					codes += parseValue(logic.slice(1));
				} else {
					codes += logic;
				}
				if (debug) {
					codes += '__line__+=' + (logic.split(LINE_RE).length - 1) + ';';
				}
			}
		});

		codes += 'return __ret__;';

		if (debug) {
			codes += '}catch(e){__rethrow__(e, __template__, __line__)}';
		}

		var fn = new Function('__template__, __data__, __escape__, __rethrow__, include', codes);

		// Wrap the escape&include function
		return function (data) {
			return fn(template, data, escapeHTML, rethrow, function (path, subData, subOptions) {
				subData = merge({}, data, subData);
				subOptions = merge({}, options, subOptions);
				return renderFileSync(path, subData, subOptions);
			});
		};
	}

	function parseHTML(codes) {
		return '__ret__+=\'' + codes.replace(ESCAPE_RE, '\\$1') + '\';';
	}

	function parseValue(codes, escape) {
		if (escape) {
			codes = '__escape__(' + codes + ')';
		}
		return '__ret__+=(' + codes + ');';
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
