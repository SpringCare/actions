const core = require('@actions/core');
const github = require('@actions/github');

import { Octokit } from '@octokit/core';
import _ from 'lodash';

const allFiles = {};

const languages = ['es', 'pt'];

function compareKeys(enKeys: Array<string>, otherKeys: Array<string>): Array<string> {
	const keyNotPresent = [];
	for (let element in enKeys) {
		if (element.includes('.')) {
			element = element.split('.').slice(-1)[0];
		}
		if (otherKeys.includes(element)) {
			otherKeys.splice(otherKeys.indexOf(element), 1);
		}
		else {
			keyNotPresent.push(element);
		}
	}

	return keyNotPresent;
}

function extractKeys(patch: string): Array<string> {
	const regExpPlus = /(?<=\+).*(?=:)/g;
	const addedKeys = patch.match(regExpPlus);

	return addedKeys.map(key => key.trim()).sort();
}

// returns an object with flattened keys
const objectPaths = (object): Record<string, string> => {
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

	// if all the keys from base are present in targetObject
	// compare keys and values
	const difference = [];
	for (const key in baseObject) {
		if (!(key in targetObject)) {
			difference.push(key);
		}
		else if (baseObject[key] !== targetObject[key]) {
			difference.push(key);
		}
	}

	return difference.sort();
}

function validateKeySync(keyDifference: Array<string>, file: string): object {
	const fileNotPresent = [];
	const keyNotPresent = [];
	for (const lang of languages) {
		if (allFiles[lang] === undefined)
			continue;

		if (allFiles[lang][file] === undefined) {
			fileNotPresent.push({lang: file});
			continue;
		}

		const patchedKeys = extractKeys(allFiles[lang][file]);

		keyNotPresent.push({lang: compareKeys(keyDifference, patchedKeys)});

	}
	return {
		'fileNotPresent' : fileNotPresent.length? fileNotPresent: null,
		'keyNotPresent'  : keyNotPresent.length? keyNotPresent: null
	};
}

// returns an file: patch object for lang keys
/**
* {
*  en: {
*    file1: raw_url1,
*    file2: raw_url2
*  },
* es: {
*    file1: patch1
*  }
* }
*/
function transformResponse(response: Record<string, any>) {

	// Todo: change this to locale path: `.*\/locales\/.*.json`
	const filesFromResponse = response.data.filter(elem => new RegExp('.*/locales/.*.json').test(elem.filename));

	filesFromResponse.forEach(element => {
		const path = element.filename.split('/');
		const lang = path.slice(-2)[0];
		const filename = path.slice(-1)[0];

		if (!(lang in allFiles)) {
			allFiles[lang] = {};
		}
		let store = '';
		if (lang === 'en') store = element.raw_url;
		else store = element.patch;

		allFiles[lang][filename] = store;
	});
}

function languageCheck(): Array<string> {
	const langNotPresent = [];
	for (const lang of languages) {
		if (allFiles[lang] === undefined) {
			langNotPresent.push(lang);
		}
	}

	return langNotPresent;
}

async function main (): Promise<void> {
	const inputs: {
		token: string;
		base_branch: string;
		target_branch: string;
	} = {
		token         : core.getInput('repo-token', { required: true }),
		base_branch   : core.getInput('base-branch'),
		target_branch : core.getInput('target-branch')
	};

	const pullNumber = github.context.payload.pull_request.number;
	const repository = github.context.repo;

	const octokit = new Octokit({ auth: inputs.token });

	const response = await octokit.request(
		'GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
			owner       : repository.owner,
			repo        : repository.repo,
			pull_number : pullNumber
		}
	);

	transformResponse(response);

	if (allFiles['en'] === undefined) {
		console.log('No modified/added keys in english locale');
		return;
	}

	const langNotPresent = languageCheck();

	for (const file in allFiles['en']) {
		// get file diff i.e. compareFiles
		const baseFile = await octokit.request(
			'GET /repos/{owner}/{repo}/contents/{path}?ref={target_branch}', {
				headers: {
					Accept: 'application/vnd.github.v3.raw',
				},
				owner         : 'utsav00',
				repo          : 'Diff-Checker-on-Actions',
				path          : `en/${file}`,
				target_branch : inputs.base_branch
			}
		);
		const targetFile = await octokit.request(
			'GET /repos/{owner}/{repo}/contents/{path}?ref={target_branch}', {
				headers: {
					Accept: 'application/vnd.github.v3.raw',
				},
				owner         : 'utsav00',
				repo          : 'Diff-Checker-on-Actions',
				path          : `en/${file}`,
				target_branch : inputs.target_branch
			}
		);
		const keyDifference = compareFiles(JSON.parse(baseFile.data), JSON.parse(targetFile.data));
		const absent = validateKeySync(keyDifference, file);

		if (langNotPresent.length !== 0)
			console.log(langNotPresent);
		if (!(_.isEmpty(absent['fileNotPresent']) || _.isEmpty(['keyNotPresent'])))
			console.log(absent);
	}
}

main();