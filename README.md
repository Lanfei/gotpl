# GoTpl [![NPM version][npm-image]][npm-url]

A lightweight, high-performance JavaScript template engine.

## Installation

```bash
$ npm install gotpl
```

## Examples

```html
<h1>Projects</h1>
<ul id="list"></ul>

<% if (projects.length) { %>
	<% for (var i = 0, l = projects.length; i < l; ++i) { %>
		<% var item = projects[i]; %>
		<li class="item">
			<a target="_blank" href="<%=item.url%>"><%= item.name %></a>
		</li>
	<% } %>
<% } %>
```

## Usages

### Browser

```js
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
		name: 'GoNode',
		url: 'https://github.com/Lanfei/GoNode'
	}]
};
var tpl = document.getElementById('tpl').innerHTML;
document.getElementById('list').innerHTML = gotpl.render(tpl, data);
```

### Node/io.js

```js
gotpl.render(str, data, options);

gotpl.renderFileSync(path, data, options);

gotpl.renderFile(path, data, options, function(err, html){
	// Some codes.
});
```

### Express

```js
app.engine('tpl', template.renderFile);
app.set('view engine', 'tpl');
```

## Options

- `root` The root of template files
- `cache` Enable caching, defaults to `true`
- `minify` Minify indents, defaults to `true`
- `openTag` Open tag, defaults to "<%"
- `closeTag` Close tag, defaults to "%>"

## Tags

- `<% code %>` Logic code
- `<%= value =>` Output the value as escaped HTML
- `<%- value %>` Output the value as unescaped HTML

## includes

Use `include(path[, data, options])` function to import partial templates, and use `<%- value %>` tag to output:

```html
<h1>Projects</h1>
<ul id="list"></ul>

<% if (projects.length) { %>
	<% for (var i = 0, l = projects.length; i < l; ++i) { %>
		<%- include('project', projects[i]) %>
	<% } %>
<% } %>
```

## Speed Test

[Here is a speed test between 12 Javascript template engine.](http://lanfei.github.io/GoTpl)

[npm-url]: https://npmjs.org/package/gotpl
[npm-image]: https://badge.fury.io/js/gotpl.svg
