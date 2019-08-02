import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
//import commonjs from 'rollup-plugin-commonjs';
//import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';

//import localResolve from 'rollup-plugin-local-resolve';
import filesize from 'rollup-plugin-filesize';

const production = !process.env.ROLLUP_WATCH;

function createPluginsArray(modulename) {
	return [
		svelte({
			dev: !production,
			css: css => {
				css.write('./static/css/svelte.css');
			},
			customElement: true,
			//tag: "ui-" + modulename
		}),
		resolve({
			browser: true,
			modulesOnly: true,
			dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/')
		}),
//		!production && livereload('./assets/js/'),
		production && terser(),
		filesize(),
	];
}

function createConfig(modulename, inputfile) {
	return {
		input: `${inputfile}`,
		output: [
			{
				file: `./static/js/cmp/${modulename}.js`,
				format: 'esm',
				sourcemap: true,
			},
		],
		watch: {
			clearScreen: false
		},
		plugins: createPluginsArray(modulename),
	};
};

const path = require('path');
const fs = require('fs');
const directoryPath = path.join(__dirname, 'assets/js');
const configs = fs.readdirSync(directoryPath).reduce(function (list, filename) {
	const absFilepath = path.join(directoryPath, filename);
	const isDir = fs.statSync(absFilepath).isDirectory();
	const indexFile = path.join(absFilepath, "index.js");
	if (isDir && fs.existsSync(indexFile)) {
		return list.concat(createConfig(filename, indexFile));
	}
	const svelteFile = path.join(absFilepath, "index.svelte");
	if (isDir && fs.existsSync(svelteFile)) {
		return list.concat(createConfig(filename, svelteFile));
	}
	return list;
}, []);

export default configs;