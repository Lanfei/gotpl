'use strict';

var isBrowser = typeof window !== 'undefined';
var assert = (isBrowser ? window['chai'] : require('chai')).assert;
var gotpl = isBrowser ? window['gotpl'] : require('../dist/gotpl.common');

describe('gotpl.config(options)', function () {
	it('should update the default options', function () {
		assert.isFalse(gotpl.config().debug);
		gotpl.config({debug: true});
		assert.isTrue(gotpl.config().debug);
		gotpl.config({debug: false});
	});
});

describe('gotpl.compile(template, options)', function () {
	it('should compile to a function', function () {
		var fn = gotpl.compile('<%= name %>');
		assert.isFunction(fn);
	});

	it('should throw if there is a syntax error', function () {
		try {
			gotpl.compile('<% var %>');
		} catch (err) {
			assert.strictEqual(err.name, 'SyntaxError');
		}
	});

	it('should allow customizing delimiters', function () {
		gotpl.config({openTag: '<?', closeTag: '?>'});

		var fn1 = gotpl.compile('<p><?= name ?></p>');
		assert.strictEqual(fn1({name: 'gotpl'}), '<p>gotpl</p>');

		var fn2 = gotpl.compile('<p>{{= name }}</p>', {openTag: '{{', closeTag: '}}'});
		assert.strictEqual(fn2({name: 'gotpl'}), '<p>gotpl</p>');

		gotpl.config({openTag: '<%', closeTag: '%>'});
	});
});

describe('gotpl.render(str, data, options)', function () {
	it('should render the template', function () {
		var result = gotpl.render('<p>gotpl</p>');
		assert.strictEqual(result, '<p>gotpl</p>');
	});

	it('should be able to access the global scope', function () {
		var result = gotpl.render('<%= Math.max(0, 1) %>');
		assert.strictEqual(result, '1');
	});

	it('should accept variables', function () {
		var result = gotpl.render('<%= name %>', {name: 'gotpl'});
		assert.strictEqual(result, 'gotpl');
	});

	it('should minify indents', function () {
		var result = gotpl.render('<p>\n\t<b>gotpl</b></p>');
		assert.strictEqual(result, '<p>\n<b>gotpl</b></p>');
	});

	it('should render according to options', function () {
		var result = gotpl.render('<p>\n\t<b>gotpl</b></p>', null, {minify: false});
		assert.strictEqual(result, '<p>\n\t<b>gotpl</b></p>');
	});
});

describe('gotpl.renderFile(path, data, options, callback)', function () {
	if (isBrowser) {
		it('should be undefined in browser', function () {
			assert.strictEqual(gotpl.renderFile, undefined);
		});
	} else {
		it('should render a file', function (done) {
			gotpl.renderFile('test/fixtures/normal.tpl', function (err, result) {
				assert.strictEqual(result, '<p>gotpl</p>');
				done();
			});
		});

		it('should accept variables', function (done) {
			gotpl.renderFile('test/fixtures/variable.tpl', {name: 'gotpl'}, function (err, result) {
				assert.strictEqual(result, 'gotpl');
				done();
			});
		});

		it('should render a file without extension', function (done) {
			gotpl.renderFile('test/fixtures/normal', function (err, result) {
				assert.strictEqual(result, '<p>gotpl</p>');
				done();
			});
		});

		it('should render a file according to `root` option', function (done) {
			gotpl.renderFile('normal.tpl', null, {root: 'test/fixtures'}, function (err, result) {
				assert.strictEqual(result, '<p>gotpl</p>');
				done();
			});
		});

		it('should return by callback if there is any error', function (done) {
			gotpl.renderFile('test/fixtures/not-exists.tpl', function (err) {
				assert.instanceOf(err, Error);
				done();
			});
		});

		it('should have the line number from the error if `debug` option is true', function (done) {
			gotpl.renderFile('test/fixtures/error.tpl', null, {debug: true}, function (err) {
				assert.isNumber(err.line);
				done();
			});
		});

		it('should return a promise if `callback` option is not provided', function (done) {
			var promise = gotpl.renderFile('test/fixtures/normal.tpl');
			assert.instanceOf(promise, Promise);
			promise.then(function (result) {
				assert.strictEqual(result, '<p>gotpl</p>');
				done();
			});
		});

		it('should reject the promise if there is any error', function (done) {
			var promise = gotpl.renderFile('test/fixtures/error.tpl');
			assert.instanceOf(promise, Promise);
			promise.catch(function (err) {
				assert.instanceOf(err, Error);
				done();
			});
		});
	}
});

describe('gotpl.renderFileSync(path, data, options)', function () {
	if (isBrowser) {
		it('should be undefined in browser', function () {
			assert.strictEqual(gotpl.renderFileSync, undefined);
		});
	} else {
		it('should render a file', function () {
			var result = gotpl.renderFileSync('test/fixtures/normal.tpl');
			assert.strictEqual(result, '<p>gotpl</p>');
		});

		it('should accept variables', function () {
			var result = gotpl.renderFileSync('test/fixtures/variable.tpl', {name: 'gotpl'});
			assert.strictEqual(result, 'gotpl');
		});

		it('should render a file without extension', function () {
			var result = gotpl.renderFileSync('test/fixtures/normal');
			assert.strictEqual(result, '<p>gotpl</p>');
		});

		it('should render a file according to `root` option', function () {
			var result = gotpl.renderFileSync('normal.tpl', null, {root: 'test/fixtures'});
			assert.strictEqual(result, '<p>gotpl</p>');
		});

		it('should throw if there is any error', function () {
			assert.throws(function () {
				gotpl.renderFileSync('test/fixtures/error.tpl');
			});
		});
	}
});

if (!isBrowser) {
	describe('gotpl.version', function () {
		it('should the same with package.json', function () {
			assert.strictEqual(gotpl.version, require('../package.json').version);
		});
	});
}

describe('<%=', function () {
	it('should escape special HTML characters', function () {
		var result = gotpl.render('<%= name %>', {name: '&nbsp;<img src="" alt=\'\'>'});
		assert.strictEqual(result, '&amp;nbsp;&lt;img src=&quot;&quot; alt=&#39;&#39;&gt;');
	});
});

describe('<%-', function () {
	it('should not escape special HTML characters', function () {
		var result = gotpl.render('<%- name %>', {name: '&nbsp;<img src="" alt=\'\'>'});
		assert.strictEqual(result, '&nbsp;<img src="" alt=\'\'>');
	});
});

describe('includes', function () {
	function renderTemplate(template, data) {
		if (isBrowser) {
			return gotpl.render(document.getElementById(template).innerHTML.trim(), data);
		} else {
			return gotpl.renderFileSync(template, data, {root: 'test/fixtures'});
		}
	}

	it('should include partial templates', function () {
		var result = renderTemplate('include');
		assert.strictEqual(result, '<p>Hello</p><p>gotpl</p>');
	});

	it('should include nested templates', function () {
		var result = renderTemplate('nest');
		assert.strictEqual(result, '<p>Hello</p><p>gotpl</p>');
	});

	it('should pass variables to included templates', function () {
		var result = renderTemplate('nest', {hello: 'Hi'});
		assert.strictEqual(result, '<p>Hi</p><p>gotpl</p>');
	});
});
