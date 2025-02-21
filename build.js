const fs = require('fs');
const path = require('path');

const ncc = require('@vercel/ncc');

const IGNORE = /^utils/;

function getBuildFiles(dir, prepend = '') {
	return fs.readdirSync(dir).reduce((acc, val) => {
		const fullPath = path.join(dir, val);
		if (!IGNORE.test(val)) {
			if (fs.lstatSync(fullPath).isDirectory()) {
				acc.push(...getBuildFiles(fullPath, `${prepend}${val}/`));
			} else if (val.endsWith('.js') || val.endsWith('.ts')) {
				acc.push(prepend.length ? `${prepend}${val}` : val);
			}
		}
		return acc;
	}, []);
}

function clearDirectory(directory) {
	if (fs.existsSync(directory)) {
		fs.rmSync(directory, { recursive: true, force: true });
	}
}

clearDirectory('./dist');

getBuildFiles('./src').forEach(async (file) => {
	let jsFile = file.replace(/\.ts$/, '.js');
	const inputPath = path.resolve(`./src/${file}`);
	const outputPath = path.resolve(`./dist/${jsFile}`);

	console.log(`Building ${inputPath} to ${outputPath}`);

	try {
		const { code } = await ncc(inputPath, { minify: true });

		// Ensure the directory structure exists
		const dir = path.dirname(outputPath);
		fs.mkdirSync(dir, { recursive: true });

		fs.writeFileSync(outputPath, code);
		console.log(`Wrote ${jsFile}`);

		// Copy action.yml if it exists
		const actionYamlPath = path.join('./src', path.dirname(file), 'action.yml');
		const destYamlPath = path.join('./dist', path.dirname(file), 'action.yml');
		if (fs.existsSync(actionYamlPath)) {
			fs.copyFileSync(actionYamlPath, destYamlPath);
			console.log('Copied action.yml');
		}
	} catch (error) {
		console.error(`Error building ${file}:`, error);
	}
});

