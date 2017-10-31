const postcss = require('postcss');
const path = require('path');
const readCache = require('read-cache');

let plugin;

plugin = postcss.plugin('postcss-import-pcss', opts => {
	opts = Object.assign({}, opts);
	return (css, result) => {
		if (result.opts.to) // workaround for ExtractTextPlugin
			opts.loaded = new Set();
		let p = Promise.resolve();
		css.walkAtRules("import", rule => {
			if (!rule.params.match(/"(.*\/)?_[^\/]*\.pcss"$/))
				return;
			let file = path.dirname(rule.source.input.file) + '/' + rule.params.replace(/"/g, '');
			p = p
				.then(_ => {
					return new Promise((resolve, reject) => {
						if (opts.loaded.has(file)) {
							rule.remove();
							reject();
						}
						//opts.loaded.add(file); // Cannot use it because of ExtractTextPlugin bug
						resolve();
					});
				})
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