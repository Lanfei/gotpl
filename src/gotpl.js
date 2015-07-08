/**
 * GoTpl 4.0.0
 * https://github.com/Lanfei/GoTpl
 * (c) 2014 [Lanfei](http://www.clanfei.com/)
 * A lightweight template engine with cache mechanism.
 */
(function(global) {

	var gotpl = {
		config: config,
		render: render,
		renderFile: renderFile,
		compile: compile,
		version: '4.0.0'
	};

	// Default Options
	var defOpts = {
		base: '',
		cache: true,
		openTag: '<%',
		closeTag: '%>'
	};

	// Special HTML characters
	var escapeMap = {
		'<': '&#60;',
		'>': '&#62;',
		'"': '&#34;',
		"'": '&#39;',
		'&': '&#38;'
	};

	// Caches
	var tplCache = {};
	var fileCache = {};

	var clone = Object.create || function(obj) {
		var newObj = {};
		for (var key in obj) {
			newObj[key] = obj[key];
		}
		return newObj;
	};

	// Configure function
	function config(key, value) {
		if (typeof key === 'object') {
			for (var i in defOpts) {
				defOpts[i] = key[i];
			}
		} else {
			defOpts[key] = value;
		}
	}

	// Return the rendering template
	function render(template, data, options) {
		var key,
			cache,
			compiled;
		// Check witch cache to use
		if (options && options.base) {
			cache = fileCache;
			key = options.base;
		} else {
			cache = tplCache;
			key = template;
		}
		compiled = cache[key];
		if (!compiled) {
			compiled = compile(template, data, options);
			// Cache the compiled function
			if (defOpts.cache) {
				cache[key] = compiled;
			}
		}
		return compiled(data, escapeHTML, function(path, partialData) {
			return renderFileSync(path, partialData || data, Object.create(options));
		});
	}

	// Render file for Node/io.js
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

	// Render file in sync for Node/io.js
	function renderFileSync(path, data, options) {
		options = options || {};
		var fs = require('fs');
		var filename = resolvePath(path, options.base);
		var template;
		if (!fileCache[filename]) {
			template = fs.readFileSync(filename).toString()
		}
		options.base = filename;
		return render(template, data, options);
	}

	// Resolve the template path for Node/io.js
	function resolvePath(filename, base) {
		var path = require('path');
		if (!path.isAbsolute(filename)) {
			if (base) {
				base = path.resolve(base);
			} else {
				base = defOpts.base;
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

	// Return the compiled function
	function compile(template, data, options) {
		var openTag, closeTag, code = 'var ';
		data = data || {};
		options = options || {};
		openTag = options.openTag || defOpts.openTag;
		closeTag = options.closeTag || defOpts.closeTag;

		// Parse `typeof`
		template.replace(/typeof ([$\w]+)/g, function(_, $1) {
			data[$1] = undefined;
		});

		// Extract variables
		for (var key in data) {
			code += key + '=__data__[\'' + key + '\'],';
		}

		code += '__ret__=\'\';';

		// Parse the template
		template = template.replace(/\s+/g, ' ');
		template.split(closeTag).forEach(function(segment) {
			var split = segment.split(openTag),
				html = split[0],
				logic = split[1];
			code += parseHTML(html);
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

		return new Function('__data__, __escape__, include', code);
	}

	function parseHTML(code) {
		return '__ret__+=\'' + code.replace(/('|\\)/g, '\\$1') + '\';';
	}

	function parseValue(code, escape) {
		if (escape) {
			code = '__escape__(' + code + ')';
		}
		return '__ret__+=(' + code + ');';
	}

	function escapeChar(char) {
		return escapeMap[char];
	}

	function escapeHTML(value) {
		return String(value).replace(/&(?![\w#]+;)|[<>"']/g, escapeChar);
	}

	// Expose
	if (typeof module === 'object' && typeof module.exports === 'object') {
		module.exports = gotpl;
	} else if (typeof define === "function") {
		define(gotpl);
	} else {
		global.gotpl = gotpl;
	}

})(this);