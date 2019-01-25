const isBrowser = typeof window !== 'undefined';
const expect = isBrowser ? window.expect : require('expect.js');
const gotpl = isBrowser ? window.gotpl : require('../dist/gotpl.common');

describe('gotpl.config(options)', function () {
	it('should update the default options', function () {
		expect(gotpl.config().debug).to.be(false);
		gotpl.config({debug: true});
		expect(gotpl.config().debug).to.be(true);
		gotpl.config({debug: false});
	});
});

describe('gotpl.compile(template, options)', function () {
	it('should compile to a function', function () {
		let fn = gotpl.compile('<%= name %>');
		expect(fn).to.be.a('function');
	});

	it('should throw if there is a syntax error', function () {
		try {
			gotpl.compile('<% var %>');
		} catch (err) {
			expect(err.name).to.equal('SyntaxError');
		}
	});

	it('should allow customizing delimiters', function () {
		gotpl.config({openTag: '<?', closeTag: '?>'});

		let fn1 = gotpl.compile('<p><?= name ?></p>');
		expect(fn1({name: 'gotpl'})).to.equal('<p>gotpl</p>');

		let fn2 = gotpl.compile('<p>{{= name }}</p>', {openTag: '{{', closeTag: '}}'});
		expect(fn2({name: 'gotpl'})).to.equal('<p>gotpl</p>');

		gotpl.config({openTag: '<%', closeTag: '%>'});
	});
});

describe('gotpl.render(str, data, options)', function () {
	it('should render the template', function () {
		let result = gotpl.render('<p>gotpl</p>');
		expect(result).to.equal('<p>gotpl</p>');
	});

	it('should be able to access the global scope', function () {
		let result = gotpl.render('<%= Math.max(0, 1) %>');
		expect(result).to.equal('1');
	});

	it('should accept variables', function () {
		let result = gotpl.render('<%= name %>', {name: 'gotpl'});
		expect(result).to.equal('gotpl');
	});

	it('should minify indents', function () {
		let result = gotpl.render('<p>\n\t<b>gotpl</b></p>');
		expect(result).to.equal('<p>\n<b>gotpl</b></p>');
	});

	it('should render according to options', function () {
		let result = gotpl.render('<p>\n\t<b>gotpl</b></p>', null, {minify: false});
		expect(result).to.equal('<p>\n\t<b>gotpl</b></p>');
	});
});

describe('gotpl.renderFile(path, data, options, callback)', function () {
	if (isBrowser) {
		it('should be undefined in browser', function () {
			expect(gotpl.renderFile).to.be(undefined);
		});
	} else {
		it('should render a file', function (done) {
			gotpl.renderFile('test/fixtures/normal.tpl', function (err, result) {
				expect(result).to.equal('<p>gotpl</p>');
				done();
			});
		});

		it('should accept variables', function (done) {
			gotpl.renderFile('test/fixtures/variable.tpl', {name: 'gotpl'}, function (err, result) {
				expect(result).to.equal('gotpl');
				done();
			});
		});

		it('should render a file without extension', function (done) {
			gotpl.renderFile('test/fixtures/normal', function (err, result) {
				expect(result).to.equal('<p>gotpl</p>');
				done();
			});
		});

		it('should render a file according to `root` option', function (done) {
			gotpl.renderFile('normal.tpl', null, {root: 'test/fixtures'}, function (err, result) {
				expect(result).to.equal('<p>gotpl</p>');
				done();
			});
		});

		it('should return by callback if there is any error', function (done) {
			gotpl.renderFile('test/fixtures/not-exists.tpl', function (err) {
				expect(err).to.be.an(Error);
				done();
			});
		});

		it('should have the line number from the error if `debug` option is true', function (done) {
			gotpl.renderFile('test/fixtures/error.tpl', null, {debug: true}, function (err) {
				expect(err.line).to.be.an('number');
				done();
			});
		});

		it('should return a promise if `callback` option is not provided', function (done) {
			let promise = gotpl.renderFile('test/fixtures/normal.tpl');
			expect(promise).to.be.a(Promise);
			promise.then(function (result) {
				expect(result).to.equal('<p>gotpl</p>');
				done();
			});
		});

		it('should reject the promise if there is any error', function (done) {
			let promise = gotpl.renderFile('test/fixtures/error.tpl');
			expect(promise).to.be.a(Promise);
			promise.catch(function (err) {
				expect(err).to.be.an(Error);
				done();
			});
		});
	}
});

describe('gotpl.renderFileSync(path, data, options)', function () {
	if (isBrowser) {
		it('should be undefined in browser', function () {
			expect(gotpl.renderFileSync).to.be(undefined);
		});
	} else {
		it('should render a file', function () {
			let result = gotpl.renderFileSync('test/fixtures/normal.tpl');
			expect(result).to.equal('<p>gotpl</p>');
		});

		it('should accept variables', function () {
			let result = gotpl.renderFileSync('test/fixtures/variable.tpl', {name: 'gotpl'});
			expect(result).to.equal('gotpl');
		});

		it('should render a file without extension', function () {
			let result = gotpl.renderFileSync('test/fixtures/normal');
			expect(result).to.equal('<p>gotpl</p>');
		});

		it('should render a file according to `root` option', function () {
			let result = gotpl.renderFileSync('normal.tpl', null, {root: 'test/fixtures'})
			expect(result).to.equal('<p>gotpl</p>');
		});

		it('should throw if there is any error', function () {
			try {
				gotpl.renderFileSync('test/fixtures/error.tpl');
			} catch (err) {
				expect(err).to.be.an(Error);
			}
		});
	}
});

if (!isBrowser) {
	describe('gotpl.version', function () {
		it('should the same with package.json', function () {
			expect(gotpl.version).to.equal(require('../package.json').version);
		});
	});
}

describe('<%=', function () {
	it('should escape special HTML characters', function () {
		let result = gotpl.render('<%= name %>', {name: '&nbsp;<img src="" alt=\'\'>'});
		expect(result).to.equal('&amp;nbsp;&lt;img src=&quot;&quot; alt=&#39;&#39;&gt;');
	});
});

describe('<%-', function () {
	it('should not escape special HTML characters', function () {
		let result = gotpl.render('<%- name %>', {name: '&nbsp;<img src="" alt=\'\'>'});
		expect(result).to.equal('&nbsp;<img src="" alt=\'\'>');
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
		let result = renderTemplate('include');
		expect(result).to.equal('<p>Hello</p><p>gotpl</p>');
	});

	it('should include nested templates', function () {
		let result = renderTemplate('nest');
		expect(result).to.equal('<p>Hello</p><p>gotpl</p>');
	});

	it('should pass variables to included templates', function () {
		let result = renderTemplate('nest', {hello: 'Hi'});
		expect(result).to.equal('<p>Hi</p><p>gotpl</p>');
	});
});
