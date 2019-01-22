const isBrowser = typeof window !== 'undefined';
const expect = isBrowser ? window.expect : require('expect.js');
const gotpl = isBrowser ? window.gotpl : require('../dist/gotpl.common');

describe('gotpl.config(options)', () => {
	it('should update the default options', () => {
		expect(gotpl.config().debug).to.be(false);
		gotpl.config({debug: true});
		expect(gotpl.config().debug).to.be(true);
		gotpl.config({debug: false});
	});
});

describe('gotpl.compile(template, options)', () => {
	it('should compile to a function', () => {
		let fn = gotpl.compile('<%= name %>');
		expect(fn).to.be.a('function');
	});

	it('should throw if there is a syntax error', () => {
		try {
			gotpl.compile('<% var %>');
		} catch (err) {
			expect(err.name).to.be.equal('SyntaxError');
		}
	});

	it('should allow customizing delimiters', () => {
		gotpl.config({openTag: '<?', closeTag: '?>'});

		let fn1 = gotpl.compile('<p><?= name ?></p>');
		expect(fn1({name: 'gotpl'})).to.be.equal('<p>gotpl</p>');

		let fn2 = gotpl.compile('<p>{{= name }}</p>', {openTag: '{{', closeTag: '}}'});
		expect(fn2({name: 'gotpl'})).to.be.equal('<p>gotpl</p>');

		gotpl.config({openTag: '<%', closeTag: '%>'});
	});
});

describe('gotpl.render(str, data, options)', () => {
	it('should render the template', () => {
		let result = gotpl.render('<p>gotpl</p>');
		expect(result).to.be.equal('<p>gotpl</p>');
	});

	it('should be able to access the global scope', () => {
		let result = gotpl.render('<%= Math.max(0, 1) %>');
		expect(result).to.be.equal('1');
	});

	it('should accept variables', () => {
		let result = gotpl.render('<%= name %>', {name: 'gotpl'});
		expect(result).to.be.equal('gotpl');
	});

	it('should render according to options', () => {
		let result = gotpl.render('\t<p>gotpl</p>', null, {minify: true});
		expect(result).to.be.equal('<p>gotpl</p>');
	});
});

describe('gotpl.renderFile(path, data, options, callback)', () => {
	if (isBrowser) {
		it('should be undefined in browser', () => {
			expect(gotpl.renderFile).to.be(undefined);
		});
	} else {
		it('should render a file', done => {
			gotpl.renderFile('test/fixtures/normal.tpl', (err, result) => {
				expect(result).to.be.equal('<p>gotpl</p>');
				done();
			});
		});

		it('should accept variables', done => {
			gotpl.renderFile('test/fixtures/variable.tpl', {name: 'gotpl'}, (err, result) => {
				expect(result).to.be.equal('gotpl');
				done();
			});
		});

		it('should render a file without extension', done => {
			gotpl.renderFile('test/fixtures/normal', (err, result) => {
				expect(result).to.be.equal('<p>gotpl</p>');
				done();
			});
		});

		it('should render a file according to `root` option', done => {
			gotpl.renderFile('normal.tpl', null, {root: 'test/fixtures'}, (err, result) => {
				expect(result).to.be.equal('<p>gotpl</p>');
				done();
			});
		});

		it('should return by callback if there is any error', done => {
			gotpl.renderFile('test/fixtures/error.tpl', err => {
				expect(err).to.be.an(Error);
				done();
			});
		});

		it('should have the line number from the error if `debug` option is true', done => {
			gotpl.renderFile('test/fixtures/error.tpl', null, {debug: true}, err => {
				expect(err.line).to.be.an('number');
				done();
			});
		});

		it('should return a promise if `callback` option is not provided', done => {
			let promise = gotpl.renderFile('test/fixtures/normal.tpl');
			expect(promise).to.be.a(Promise);
			promise.then(result => {
				expect(result).to.be.equal('<p>gotpl</p>');
				done();
			});
		});

		it('should reject the promise if there is any error', done => {
			let promise = gotpl.renderFile('test/fixtures/error.tpl');
			expect(promise).to.be.a(Promise);
			promise.catch(err => {
				expect(err).to.be.an(Error);
				done();
			});
		});
	}
});

describe('gotpl.renderFileSync(path, data, options)', () => {
	if (isBrowser) {
		it('should be undefined in browser', () => {
			expect(gotpl.renderFileSync).to.be(undefined);
		});
	} else {
		it('should render a file', () => {
			let result = gotpl.renderFileSync('test/fixtures/normal.tpl');
			expect(result).to.be.equal('<p>gotpl</p>');
		});

		it('should accept variables', () => {
			let result = gotpl.renderFileSync('test/fixtures/variable.tpl', {name: 'gotpl'});
			expect(result).to.be.equal('gotpl');
		});

		it('should render a file without extension', () => {
			let result = gotpl.renderFileSync('test/fixtures/normal');
			expect(result).to.be.equal('<p>gotpl</p>');
		});

		it('should render a file according to `root` option', () => {
			let result = gotpl.renderFileSync('normal.tpl', null, {root: 'test/fixtures'})
			expect(result).to.be.equal('<p>gotpl</p>');
		});

		it('should throw if there is any error', () => {
			try {
				gotpl.renderFileSync('test/fixtures/error.tpl');
			} catch (err) {
				expect(err).to.be.an(Error);
			}
		});
	}
});

describe('<%=', () => {
	it('should escape special HTML characters', () => {
		let result = gotpl.render('<%= name %>', {name: '&nbsp;<img src="" alt=\'\'>'});
		expect(result).to.be.equal('&amp;nbsp;&lt;img src=&quot;&quot; alt=&#39;&#39;&gt;');
	});
});

describe('<%-', () => {
	it('should not escape special HTML characters', () => {
		let result = gotpl.render('<%- name %>', {name: '&nbsp;<img src="" alt=\'\'>'});
		expect(result).to.be.equal('&nbsp;<img src="" alt=\'\'>');
	});
});

describe('includes', () => {
	function renderTemplate(template, data) {
		if (isBrowser) {
			return gotpl.render(document.getElementById(template).innerHTML.trim(), data);
		} else {
			return gotpl.renderFileSync(template, data, {root: 'test/fixtures'});
		}
	}

	it('should include partial templates', () => {
		let result = renderTemplate('include');
		expect(result).to.be.equal('<p>Hello</p><p>gotpl</p>');
	});

	it('should include nested templates', () => {
		let result = renderTemplate('nest');
		expect(result).to.be.equal('<p>Hello</p><p>gotpl</p>');
	});

	it('should pass variables to included templates', () => {
		let result = renderTemplate('nest', {hello: 'Hi'});
		expect(result).to.be.equal('<p>Hi</p><p>gotpl</p>');
	});
});
