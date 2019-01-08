(function () {
	var result = document.getElementById('result');
	var tplEditor = ace.edit("template");
	tplEditor.setTheme("ace/theme/github");
	tplEditor.getSession().setMode("ace/mode/ejs");
	tplEditor.setHighlightActiveLine(false);
	tplEditor.on('change', render);
	var dataEditor = ace.edit("data");
	dataEditor.setTheme("ace/theme/github");
	dataEditor.getSession().setMode("ace/mode/json");
	dataEditor.setHighlightActiveLine(false);
	dataEditor.on('change', render);

	window.dataLayer = window.dataLayer || [];

	gotpl.config({
		debug: true
	});

	function render() {
		var tpl = tplEditor.getValue();
		var json = dataEditor.getValue();
		try {
			var data = JSON.parse(json);
			result.innerHTML = gotpl.render(tpl, data);
		} catch (e) {
			console.error(e);
			result.innerHTML = '<pre>' + htmlEncode(e.message) + '</pre>';
		}
	}

	function htmlEncode(str) {
		var ele = document.createElement('div');
		ele.appendChild(document.createTextNode(str));
		return ele.innerHTML;
	}

	function gtag() {
		dataLayer.push(arguments);
	}

	render();

	gtag('js', new Date());
	gtag('config', 'UA-57981079-1');
	gtag('event', 'pv', {event_category: 'gotpl'});
})();
