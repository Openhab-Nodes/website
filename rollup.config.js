import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
//import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import json from 'rollup-plugin-json';

//import localResolve from 'rollup-plugin-local-resolve';
import filesize from 'rollup-plugin-filesize';

const path = require('path');
const fs = require('fs');

const production = !process.env.ROLLUP_WATCH;

function createPluginsArray(modulename, make_custom_component, use_commonjs) {
	return [
		svelte({
			dev: !production,
			// css: css => {
			// 	css.write('./static/css/svelte.css');
			// },
			customElement: make_custom_component,
			//tag: "ui-" + modulename
		}),
		resolve({
			modulesOnly: false,
			mainFields: ["module", "main", "browser"],
			dedupe: importee => importee === 'svelte' || importee.startsWith('svelte/') ||
				importee === 'firebase' || importee.startsWith('firebase/') ||
				importee === '@firebase' || importee.startsWith('@firebase/') ||
				importee === 'firebaseui' || importee.startsWith('firebaseui/')
		}),
		json({
			preferConst: true,
			compact: true,
			namedExports: false
		}),
		use_commonjs && commonjs(),
		//terser({module:true,ecma:8}),
		filesize()
	];
}

function createConfig(modulename, inputfile, make_custom_component = false, use_commonjs = false) {
	return {
		input: `${inputfile}`,
		output: [
			{
				file: `./static/js/cmp/${modulename}.js`,
				format: 'esm',
				sourcemap: true,
			},
		],
		external: [
			'/js/cmp/userdata.js', '/js/cmp/ui-firebaseui.js', '/js/fuse.min.js'
		],
		watch: {
			clearScreen: false,
			exclude: 'node_modules/**|*.map'
		},
		plugins: createPluginsArray(modulename, make_custom_component, use_commonjs),
	};
};


const directoryPath = path.join(__dirname, 'assets/js');
const configs = fs.readdirSync(directoryPath).reduce(function (list, filename) {
	const absFilepath = path.join(directoryPath, filename);
	const isDir = fs.statSync(absFilepath).isDirectory();
	const indexFile = path.join(absFilepath, "index.js");

	const use_commonjs = fs.existsSync(path.join(absFilepath, "pre_module_transpile"));
	if (use_commonjs) console.log("Using Commonjs for ", path);

	if (isDir && fs.existsSync(indexFile)) {
		return list.concat(createConfig(filename, indexFile, false, use_commonjs));
	}
	const svelteFile = path.join(absFilepath, "index.svelte");
	if (isDir && fs.existsSync(svelteFile)) {
		const make_custom_component = fs.existsSync(path.join(absFilepath, "custom_component"));
		return list.concat(createConfig(filename, svelteFile, make_custom_component, use_commonjs));
	}
	return list;
}, []);

export default configs;