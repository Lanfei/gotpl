var LiteTpl = (function() {

	var defaults = {
		cache: true,
		openTag: '<%',
		closeTag: '%>'
	};

	var caches = {};

	var config = function(key, value) {
		if (typeof arguments.length === 1) {
			for (var i in defaults) {
				defaults[i] = key[i];
			}
		} else {
			defaults[key] = value;
		}
	};

	var render = function(template, data, options) {
		if (!caches[template]) {
			caches[template] = compile(template, data, options);
		}
		return caches[template](data);
	};

	var compile = function(template, data, options) {
		var openTag, closeTag, code = 'var ';
		data = data || {};
		options = options || {};
		openTag = options.openTag || defaults.openTag;
		closeTag = options.closeTag || defaults.closeTag;
		for (var key in data) {
			code += key + '=data[\'' + key + '\'],';
		}
		code = code + '__ret__=\'';
		template = template.replace(/\s+/g, ' ').replace(/'/g, '"');
		template = template.replace(new RegExp(openTag + '= *(.+?) *' + closeTag, 'g'), '\'+$1+\'');
		template = template.replace(new RegExp(openTag + ' *(.+?) *' + closeTag, 'g'), '\';$1\n__ret__+=\'');
		code += template + '\';return __ret__;';
		return new Function('data', code);
	};

	return {
		render: render,
		compile: compile
	};
})();