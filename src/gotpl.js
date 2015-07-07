/**
 * GoTpl 3.0.0
 * https://github.com/Lanfei/GoTpl
 * (c) 2014 [Lanfei](http://www.clanfei.com/)
 * A lightweight template engine with cache mechanism.
 */
(function(global) {

	// GoTpl
	var gotpl = {
		config: config,
		render: render,
		renderFile: renderFile,
		compile: compile,
		version: '3.0.0'
	};

	// Default Options
	var defOpts = {
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

	// Cache map
	var cache = {};

	function each(arr, iterator) {
		if (arr.forEach) {
			arr.forEach(iterator);
		} else {
			for (var i = 0, l = arr.length; i < l; ++i) {
				iterator(arr[i], i);
			}
		}
	}

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
		// Save the compiled function
		if (!cache[template]) {
			cache[template] = compile(template, data, options);
		}
		return cache[template](data, escapeHTML);
	}

	// Just for Node/io.js
	function renderFile(path, data, options, next) {
		if (arguments.length === 2) {
			next = data;
			data = null;
		} else if (arguments.length === 3) {
			next = options;
			options = null;
		}
		var fs = require('fs');
		fs.readFile(path, function(err, file) {
			var html;
			if (!err) {
				try {
					html = render(file.toString(), data, options);
				} catch (e) {
					err = e;
				}
			}
			next(err, html);
		});
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
		each(template.split(closeTag), function(segment) {
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

		return new Function('__data__, __escape__', code);
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
