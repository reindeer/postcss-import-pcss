const postcss = require('postcss');
const path = require('path');
const readCache = require('read-cache');

const plugin = postcss.plugin('postcss-import-pcss', opts => {
	opts = Object.assign({}, opts);
	return (css, result) => {
		let p = Promise.resolve();
		css.walkAtRules("import", rule => {
			if (!rule.params.match(/"(.*\/)?_[^\/]*\.pcss"$/))
				return;
			let file = path.dirname(rule.source.input.file) + '/' + rule.params.replace(/"/g, '');
			p = p
				.then(_ => readCache(file))
				.then(buffer => buffer.toString())
				.then(content => postcss([plugin(opts)]).process(content, {from: file}))
				.then(nodes => {
					if (nodes.root.nodes.length)
						rule.replaceWith(nodes.root.nodes);
					else
						rule.remove();
				})
				.catch(error => {
					return new Promise((resolve, reject) => {
						if (error)
							reject(error);
						resolve();
					});
				});
		});
		return p;
	};
});

module.exports = plugin;