const fs = require('fs');
const path = require('path');

const ncc = require('@zeit/ncc');

const IGNORE = new RegExp('^utils');

function getBuildFiles(path, prepend = '') {
	return fs
		.readdirSync(path)
		.reduce((acc, val) => {
			if (!IGNORE.test(val)) {
				// If Directory, need to recursively go deeper.
				if (fs.lstatSync(`${path}/${val}`).isDirectory()) {
					const nestedPages = getBuildFiles(`${path}/${val}`, `${prepend}${val}/`);
					acc.push(...nestedPages);
				} else {
					if (val.includes('.js')) {
						acc.push(prepend.length ? `${prepend}${val}` : val);
					}
				}
			}

			return acc;
		}, []);
}

function clearDirectory(directory) {
	fs.readdir(directory, (err, files) => {
		if (err) throw err;

		for (const file of files) {
			const currentPath = path.join(directory, file);

			if (fs.lstatSync(currentPath).isDirectory()) {
				clearDirectory(currentPath);
			} else {
				fs.unlink(currentPath, err => {
					if (err) throw err;
				});
			}
		}
	});
}

clearDirectory('./dist');

getBuildFiles('./src').forEach((file) => {
	const output = './dist/' + file;
	console.log(`building ${file} to ${output}`);

	ncc(`./src/${file}`).then(({ code }) => {
		let dir = file.split('/');
		dir.pop(); // remove the file name, leaving just parent dirs
		dir = dir.join('/');

		fs.mkdir(`./dist/${dir}`, { recursive: true }, (err) => {
			if (!err) {
				fs.writeFile(output, code, function() {
					console.log(`wrote ${file}`);
				});

				fs.copyFileSync(`./src/${dir}/action.yml`, `./dist/${dir}/action.yml`);
				console.log('copied action.yml');
			} else {
				console.error(err);
				return;
			}
		});
	});
});