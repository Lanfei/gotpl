/**
 * GoTpl 4.3.1
 * https://github.com/Lanfei/GoTpl
 * (c) 2014 [Lanfei](http://www.clanfei.com/)
 * A lightweight, high-performance JavaScript template engine.
 */
(function (global) {
	var gotpl = {
		config: config,
		render: render,
		renderFile: renderFile,
		renderFileSync: renderFileSync,
		compile: compile,
		version: '4.3.1'
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
	var INDENT_RE = /[\r\n]+([\f\t\v]*)/g,
		ESCAPE_RE = /('|\\)/g,
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
		return compiled(data);
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
		try {
			next(null, renderFileSync(path, data, options));
		} catch (err) {
			next(err);
		}
	}

	/**
	 * Render the file synchronously.
	 * @param {String} path      Template file path
	 * @param {Object} [data]    Template data
	 * @param {Object} [options] Rendering options
	 */
	function renderFileSync(path, data, options) {
		if (!hasExports) {
			throw new Error('Please use `render` instead in browser environment.');
		}
		options = merge({}, defOpts, options);
		var fs = require('fs');
		var filename = resolvePath(path, options.filename || options.root);
		var compiled = fileCache[filename];
		if (!compiled) {
			options.filename = filename;
			var template = fs.readFileSync(filename).toString();
			compiled = compile(template, data, options);
			// Cache the compiled function
			if (options.cache) {
				fileCache[filename] = compiled;
			}
		}
		return compiled(data);
	}

	/**
	 * Return the compiled function.
	 * @param {String} template  Template source
	 * @param {Object} [data]    Template data
	 * @param {Object} [options] Rendering options
	 * @return {Function}
	 */
	function compile(template, data, options) {
		var openTag, closeTag, code = 'var ';
		data = data || {};
		options = merge({}, defOpts, options);
		minify = options.minify;
		openTag = options.openTag;
		closeTag = options.closeTag;

		// Parse `typeof`
		template.replace(TYPEOF_RE, function (_, $1) {
			data[$1] = data[$1] || undefined;
		});

		// Extract variables
		for (var key in data) {
			code += key + '=__data__[\'' + key + '\'],';
		}

		code += '__ret__=\'\';';

		// Parse the template
		template.split(closeTag).forEach(function (segment) {
			var split = segment.split(openTag),
				html = parseHTML(split[0]),
				logic = split[1];
			if (minify) {
				html = html.replace(INDENT_RE, '\\n');
			} else {
				html = html.replace(INDENT_RE, '\\n$1');
			}
			code += html;
			if (logic) {
				if (logic.indexOf('=') === 0) {
					code += parseValue(logic.slice(1), true);
				} else if (logic.indexOf('-') === 0) {
					code += parseValue(logic.slice(1));
				} else {
					code += logic;
				}
			}
		});

		code += 'return __ret__;';

		var fn = new Function('__data__, __escape__, include', code);

		// Wrap the escape&include function
		return function (data) {
			return fn.call(null, data, escapeHTML, function (path, subData, subOptions) {
				subData = merge({}, data, subData);
				subOptions = merge({}, options, subOptions);
				return renderFileSync(path, subData, subOptions);
			});
		};
	}

	function parseHTML(code) {
		return '__ret__+=\'' + code.replace(ESCAPE_RE, '\\$1') + '\';';
	}

	function parseValue(code, escape) {
		if (escape) {
			code = '__escape__(' + code + ')';
		}
		return '__ret__+=(' + code + ');';
	}

	function escapeChar(char) {
		return ESCAPE_MAP[char];
	}

	function escapeHTML(value) {
		return (value + '').replace(/&(?![\w#]+;)|[<>"']/g, escapeChar);
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
