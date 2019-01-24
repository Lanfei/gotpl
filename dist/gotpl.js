(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.gotpl = factory());
}(this, function () { 'use strict';

	function unwrapExports (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x.default : x;
	}

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var jsTokens = createCommonjsModule(function (module, exports) {
	// Copyright 2014, 2015, 2016, 2017, 2018 Simon Lydell
	// License: MIT. (See LICENSE.)

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	// This regex comes from regex.coffee, and is inserted here by generate-index.js
	// (run `npm run build`).
	exports.default = /((['"])(?:(?!\2|\\).|\\(?:\r\n|[\s\S]))*(\2)?|`(?:[^`\\$]|\\[\s\S]|\$(?!\{)|\$\{(?:[^{}]|\{[^}]*\}?)*\}?)*(`)?)|(\/\/.*)|(\/\*(?:[^*]|\*(?!\/))*(\*\/)?)|(\/(?!\*)(?:\[(?:(?![\]\\]).|\\.)*\]|(?![\/\]\\]).|\\.)+\/(?:(?!\s*(?:\b|[\u0080-\uFFFF$\\'"~({]|[+\-!](?!=)|\.?\d))|[gmiyus]{1,6}\b(?![\u0080-\uFFFF$\\]|\s*(?:[+\-*%&|^<>!=?({]|\/(?![\/*])))))|(0[xX][\da-fA-F]+|0[oO][0-7]+|0[bB][01]+|(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)|((?!\d)(?:(?!\s)[$\w\u0080-\uFFFF]|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+)|(--|\+\+|&&|\|\||=>|\.{3}|(?:[+\-\/%&|^]|\*{1,2}|<{1,2}|>{1,3}|!=?|={1,2})=?|[?~.,:;[\](){}])|(\s+)|(^$|[\s\S])/g;

	exports.matchToToken = function(match) {
	  var token = {type: "invalid", value: match[0], closed: undefined};
	       if (match[ 1]) { token.type = "string" , token.closed = !!(match[3] || match[4]); }
	  else if (match[ 5]) { token.type = "comment"; }
	  else if (match[ 6]) { token.type = "comment", token.closed = !!match[7]; }
	  else if (match[ 8]) { token.type = "regex"; }
	  else if (match[ 9]) { token.type = "number"; }
	  else if (match[10]) { token.type = "name"; }
	  else if (match[11]) { token.type = "punctuator"; }
	  else if (match[12]) { token.type = "whitespace"; }
	  return token
	};
	});

	var jsTokens$1 = unwrapExports(jsTokens);
	var jsTokens_1 = jsTokens.matchToToken;

	// List extracted from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Keywords
	var reservedKeywords = {
	    'abstract': true,
	    'await': true,
	    'boolean': true,
	    'break': true,
	    'byte': true,
	    'case': true,
	    'catch': true,
	    'char': true,
	    'class': true,
	    'const': true,
	    'continue': true,
	    'debugger': true,
	    'default': true,
	    'delete': true,
	    'do': true,
	    'double': true,
	    'else': true,
	    'enum': true,
	    'export': true,
	    'extends': true,
	    'false': true,
	    'final': true,
	    'finally': true,
	    'float': true,
	    'for': true,
	    'function': true,
	    'goto': true,
	    'if': true,
	    'implements': true,
	    'import': true,
	    'in': true,
	    'instanceof': true,
	    'int': true,
	    'interface': true,
	    'let': true,
	    'long': true,
	    'native': true,
	    'new': true,
	    'null': true,
	    'package': true,
	    'private': true,
	    'protected': true,
	    'public': true,
	    'return': true,
	    'short': true,
	    'static': true,
	    'super': true,
	    'switch': true,
	    'synchronized': true,
	    'this': true,
	    'throw': true,
	    'transient': true,
	    'true': true,
	    'try': true,
	    'typeof': true,
	    'var': true,
	    'void': true,
	    'volatile': true,
	    'while': true,
	    'with': true,
	    'yield': true
	};

	var isKeywordJs = function(str) {
	    return reservedKeywords.hasOwnProperty(str);
	};

	/*!
	 * escape-html
	 * Copyright(c) 2012-2013 TJ Holowaychuk
	 * Copyright(c) 2015 Andreas Lubbe
	 * Copyright(c) 2015 Tiancheng "Timothy" Gu
	 * MIT Licensed
	 */

	/**
	 * Module variables.
	 * @private
	 */

	var matchHtmlRegExp = /["'&<>]/;

	/**
	 * Module exports.
	 * @public
	 */

	var escapeHtml_1 = escapeHtml;

	/**
	 * Escape special characters in the given string of html.
	 *
	 * @param  {string} string The string to escape for inserting into HTML
	 * @return {string}
	 * @public
	 */

	function escapeHtml(string) {
	  var str = '' + string;
	  var match = matchHtmlRegExp.exec(str);

	  if (!match) {
	    return str;
	  }

	  var escape;
	  var html = '';
	  var index = 0;
	  var lastIndex = 0;

	  for (index = match.index; index < str.length; index++) {
	    switch (str.charCodeAt(index)) {
	      case 34: // "
	        escape = '&quot;';
	        break;
	      case 38: // &
	        escape = '&amp;';
	        break;
	      case 39: // '
	        escape = '&#39;';
	        break;
	      case 60: // <
	        escape = '&lt;';
	        break;
	      case 62: // >
	        escape = '&gt;';
	        break;
	      default:
	        continue;
	    }

	    if (lastIndex !== index) {
	      html += str.substring(lastIndex, index);
	    }

	    lastIndex = index + 1;
	    html += escape;
	  }

	  return lastIndex !== index
	    ? html + str.substring(lastIndex, index)
	    : html;
	}

	/*!
	 * gotpl
	 * https://github.com/Lanfei/gotpl
	 * @author  Jealous
	 * @license MIT
	 */

	var version = '8.4.0';

	// Patterns
	var LINE_RE = /\r?\n/g;
	var INDENT_RE = /(^|\r|\n)+\s+/g;

	/**
	 * Default Options
	 */
	var defOpts = {
		/** The root of template files */
		root: '',
		/** Rendering context, defaults to `global` in node, `window` in browser */
		scope: window,
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
			return render(document.getElementById(path).innerHTML.trim(), data, options);
		}

		return new Function('$$scope', '$$template, $$merge, $$escape, $$include, $$rethrow', codes)(scope, template, merge, escapeHtml_1, include, rethrow);
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
			.match(jsTokens$1)
			.map(function (keyword) {
				jsTokens$1.lastIndex = 0;
				return jsTokens_1(jsTokens$1.exec(keyword));
			})
			.forEach(function (token) {
				var type = token.type;
				var value = token.value;
				if (!ignore && type === 'name' && !isKeywordJs(value) && variables.indexOf(value) < 0) {
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
		escapeHTML: escapeHtml_1,
		version: version
	};

	return gotpl;

}));
