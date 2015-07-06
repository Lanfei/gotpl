/**
 * GoTpl 2.1.1
 * https://github.com/Lanfei/GoTpl
 * (c) 2014 [Lanfei](http://www.clanfei.com/)
 * A lightweight template engine with cache mechanism
 */

(function(global) {

	// GoTpl
	var gotpl = {
		config: config,
		render: render,
		compile: compile,
		version: '2.1.0'
	};

	// Default Options
	var defaults = {
		cache: true,
		openTag: '<%',
		closeTag: '%>'
	};

	// Cache map
	var cache = {};

	var isArray = Array.isArray || function(obj) {
		return Object.toString.call(obj) === '[object Array]';
	};

	function each(obj, iterator) {
		if (isArray(obj)) {
			for (var i = 0, l = obj.length; i < l; ++i) {
				iterator(obj[i], i);
			}
		} else {
			for (var key in obj) {
				iterator(obj[key], key);
			}
		}
	}

	// Configure function
	function config(key, value) {
		if (typeof key === 'object') {
			for (var i in defaults) {
				defaults[i] = key[i];
			}
		} else {
			defaults[key] = value;
		}
	}

	// Return the rendering template
	function render(template, data, options) {
		// Save the compiled function
		if (!cache[template]) {
			cache[template] = compile(template, data, options);
		}
		return cache[template](data);
	}

	// Return the compiled function
	function compile(template, data, options) {
		var openTag, closeTag, code = 'var ';
		data = data || {};
		options = options || {};
		openTag = options.openTag || defaults.openTag;
		closeTag = options.closeTag || defaults.closeTag;

		// Parse `typeof`
		template.replace(/typeof ([$\w]+)/g, function(_, $1){
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
					code += parseValue(logic.slice(1));
				} else {
					code += logic;
				}
			}
		});

		code += 'return __ret__;';

		return new Function('__data__', code);
	}

	function parseHTML(code) {
		return '__ret__+=\'' + code.replace(/('|\\)/g, '\\$1') + '\';';
	}

	function parseValue(code) {
		return '__ret__+=(' + code + ');';
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
