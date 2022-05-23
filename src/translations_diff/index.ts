const core = require('@actions/core');
const github = require('@actions/github');

import { Octokit } from '@octokit/core';
import _ from 'lodash';

const allFiles = {};

const languages = ['es', 'fr'];

function compareKeys(
	enKeys: Record<string, any>,
	otherKeys: Record<string, any>
): boolean {
	return (
		enKeys['added'].toString() === otherKeys['added'].toString() &&
		enKeys['deleted'].toString() === otherKeys['deleted'].toString()
	);
}

function extractKeys(filename: string, patch: string): Record<string, any> {
	const regExpPlus = /(?<=\+).*(?=:)/g;
	const regExpMinus = /(?<=-).*(?=:)/g;

	const addedKeys = patch.match(regExpPlus);
	const deletedKeys = patch.match(regExpMinus);

	return {
		added   : addedKeys.map((key) => key.trim()).sort(),
		deleted : deletedKeys.map((key) => key.trim()).sort(),
	};
}

// returns an object with flattened keys
const objectPaths = (object) => {
	const result = {};
	_.forOwn(object, function (value, key) {
		if (_.isPlainObject(value)) {
			// Recursive step
			const keys = objectPaths(value);
			for (const subKey in keys) {
				const finalKey = key + '.' + subKey;
				result[finalKey] = keys[subKey];
			}
		} else {
			result[key] = value;
		}
	});
	return result;
};

function compareFiles(baseFile: string, targetFile: string): Array<string> {
	const baseObject = objectPaths(baseFile);
	const targetObject = objectPaths(targetFile);
	console.log('baseObject: ', baseObject);
	console.log('targetObject: ', targetObject);

	// if all the keys from base are present in targetObject
	// compare keys and values
	const difference = [];
	for (const key in targetObject) {
		if (!(key in baseObject)) {
			difference.push(key);
		} else if (targetObject[key] !== baseObject[key]) {
			difference.push(key);
		}
	}

	return difference.sort();
}

function validateKeySync(keyDifference: Array<string>, file: string) {
	for (const lang of languages) {
		if (allFiles[lang] === undefined) return 'Language not available';
		if (allFiles[lang][file] === undefined) return 'File not available';

		const patchedKeys = extractKeys(file, allFiles[lang][file]);

		compareKeys(keyDifference, patchedKeys);
	}
}

async function main(): Promise<void> {
	console.log('Starting');

	const inputs: {
		token: string;
		base_branch: string;
		target_branch: string;
	} = {
		token         : core.getInput('repo-token', { required: true }),
		base_branch   : core.getInput('base-branch'),
		target_branch : core.getInput('target-branch'),
	};

	console.log('inputs: ', inputs);

	const pullNumber = github.context.payload.pull_request.number;
	const repository = github.context.repo;

	const octokit = new Octokit({ auth: inputs.token });

	const resp = await octokit.request(
		'GET /repos/{owner}/{repo}/pulls/{pull_number}/files',
		{
			owner       : repository.owner,
			repo        : repository.repo,
			pull_number : pullNumber,
		}
	);

	console.log('Response: ', resp);

	const filesFromResponse = resp.data
		.map((elem) => elem.filename)
		.filter((elem) => new RegExp('.*.json').test(elem));
	console.log('Files from response: ', filesFromResponse);

	// returns an file: patch object for lang keys
	/**
	 * {
	 *  en: {
	 *    file1: patch1,
	 *    file2: patch2
	 *  },
	 * es: {
	 *    file1: patch1
	 *  }
	 * }
	 */
	// filesFromResponse.forEach((element) => {
	// 	const path = element.filename.split('/');
	// 	const n = path.length;
	// 	const lang = path[n - 2];
	// 	const filename = path[n - 1];

	// 	if (!(lang in allFiles)) {
	// 		allFiles[lang] = {};
	// 	}
	// 	allFiles[lang][filename] = element.patch;
	// });

	// core.setFailed('Failed!');
	const filterLocaleFiles = (locale: string): Array<string> => {
		return filesFromResponse.filter((elem) =>
			new RegExp(`.*/${locale}/.*.json`).test(elem)
		);
	};

	const getLastItem = (path: string): string =>
		path.substring(path.lastIndexOf('/') + 1);

	const enFilePaths = filterLocaleFiles('en');
	console.log('Filtered en locale files: ', enFilePaths);

	const enLocale = {
		locale    : 'en',
		filePaths : enFilePaths,
		fileNames : enFilePaths.map(getLastItem),
	};

	console.log('en locale: ', enLocale);

	if (enLocale.fileNames.length === 0) {
		core.setFailed('No en files found');
		return;
	}

	languages.forEach((lang) => {
		const filePaths = filterLocaleFiles(lang);
		const fileNames = filePaths.map(getLastItem);

		allFiles[lang] = {
			locale    : lang,
			filePaths : filePaths,
			fileNames : fileNames,
		};
	});

	enLocale.filePaths.forEach(async (path) => {
		let baseResp;
		try {
			baseResp = await octokit.request(
				'GET /repos/{owner}/{repo}/contents/{filePath}?ref={ref}',
				{
					headers: {
						Accept: 'application/vnd.github.v3.raw',
					},
					owner    : repository.owner,
					repo     : repository.repo,
					filePath : path,
					ref      : inputs.base_branch,
				}
			);
		} catch (error) {
			console.log('Error: ', error);
		}

		let targetResp;
		try {
			targetResp = await octokit.request(
				'GET /repos/{owner}/{repo}/contents/{filePath}?ref={ref}',
				{
					headers: {
						Accept: 'application/vnd.github.v3.raw',
					},
					owner    : repository.owner,
					repo     : repository.repo,
					filePath : path,
					ref      : inputs.target_branch,
				}
			);
		} catch (error) {
			console.log('Error: ', error);
		}

		console.log('baseResp: ', baseResp);
		console.log('targetResp: ', targetResp);

		console.log(compareFiles(JSON.parse(baseResp.data), JSON.parse(targetResp.data)));
	});
	// Todo: change this to locale path
	// const filesFromResponse = resp.data.filter(elem => new RegExp('.*.json').test(elem.filename));

	// // returns an file: patch object for lang keys
	// /**
	// * {
	// *  en: {
	// *    file1: raw_url1,
	// *    file2: raw_url2
	// *  },
	// * es: {
	// *    file1: patch1
	// *  }
	// * }
	// */
	// filesFromResponse.forEach(element => {
	// 	const path = element.filename.split('/');
	// 	const n = path.length;
	// 	const lang = path[n - 2];
	// 	const filename = path[n - 1];

	// 	if (!(lang in allFiles)) {
	// 		allFiles[lang] = {};
	// 	}
	// 	let store = '';
	// 	if (lang === 'en') store = element.raw_url;
	// 	else store = element.patch;

	// 	allFiles[lang][filename] = store;
	// });

	// for (const file in allFiles['en']) {
	// 	// get file diff i.e. compareFiles
	// 	const baseFile = resp['data']['raw_url']; // hit raw url
	// 	const targetFile = ''; // hit get content url
	// 	const keyDifference = compareFiles(baseFile, targetFile);
	// 	validateKeySync(keyDifference, file);
	// }

	// core.setFailed('Failed!');
}

main();
