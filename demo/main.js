(function() {
	// This can also be the return value of AJAX.
	var data = {
		projects: [{
			name: 'GoJS',
			url: 'https://github.com/Lanfei/GoJS'
		}, {
			name: 'Go2d',
			url: 'https://github.com/Lanfei/Go2d'
		}, {
			name: 'GoApp',
			url: 'https://github.com/Lanfei/GoApp'
		}, {
			name: 'GoTpl',
			url: 'https://github.com/Lanfei/GoTpl'
		}, {
			name: 'GoNode<img src="https://www.baidu.com/img/baidu_jgylogo3.gif">',
			url: 'https://github.com/Lanfei/GoNode'
		}]
	};
	var tpl = document.getElementById('tpl').innerHTML;
	document.getElementById('list').innerHTML = gotpl.render(tpl, data);
})();
