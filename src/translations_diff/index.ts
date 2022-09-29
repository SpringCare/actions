const core = require('@actions/core');
const github = require('@actions/github');

import { Octokit } from '@octokit/core';
import _ from 'lodash';

const allFiles = {};

function compareKeys(enKeys: Array<string>, otherKeys: Array<string>): Array<string> {
	const keyNotPresent = [];
	for (let element of enKeys) {
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
	const regExpPlus = /(?<=\+).*?(?=:)/g;
	const addedKeys = patch.match(regExpPlus);

	return addedKeys.map(key => key.trim().replace(/"/g, '')).sort();
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

function validateKeySync(keyDifference: Array<string>, fileName: string, languages: Array<string>): object {
	const fileNotPresent = [];
	const keyNotPresent = [];
	for (const lang of languages) {
		if (allFiles[lang] === undefined)
			continue;

		if (allFiles[lang][fileName] === undefined) {
			fileNotPresent.push(lang);
			continue;
		}

		const patchedKeys = extractKeys(allFiles[lang][fileName]);

		const notSynced = compareKeys(keyDifference, patchedKeys);
		if (notSynced.length !== 0)
			keyNotPresent.push({[lang]: notSynced});
	}
	return {
		'fileNotPresent' : fileNotPresent,
		'keyNotPresent'  : keyNotPresent
	};
}

// returns a file: patch object for lang keys
/**
* {
*  en: {
*    file_name1: raw_url1,
*    file_name2: raw_url2
*  },
* es: {
*    file_name1: patch1
*  }
* }
*/
function transformResponse(response: Record<string, any>): void {

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

function languageCheck(languages: Array<string>): Array<string> {
	const langNotPresent = [];
	for (const lang of languages) {
		if (allFiles[lang] === undefined) {
			langNotPresent.push(lang);
		}
	}

	return langNotPresent;
}

async function getFileContent(octokit: Octokit, branch: string, repository: Record<string, any>, file: string) {
	const content = await octokit.request(
		'GET /repos/{owner}/{repo}/contents/packages/cherrim/src/public/locales/{path}?ref={target_branch}', {
			headers: {
				Accept: 'application/vnd.github.v3.raw',
			},
			owner         : repository.owner,
			repo          : repository.repo,
			path          : `en/${file}`,
			target_branch : branch
		}
	);

	return JSON.parse(content.data);
}

async function main (): Promise<void> {
	const inputs: {
		token: string;
		base_branch: string;
		target_branch: string;
		langs: string;
	} = {
		token         : core.getInput('repo-token', { required: true }),
		base_branch   : core.getInput('base-branch'),
		target_branch : core.getInput('target-branch'),
		langs         : core.getInput('langs')
	};

	const pullNumber = github.context.payload.pull_request.number;
	const repository = github.context.repo;

	const octokit = new Octokit({ auth: inputs.token });

	const response = await octokit.request(
		'GET /repos/{owner}/{repo}/pulls/{pull_number}/files?per_page={per_page}', {
			owner       : repository.owner,
			repo        : repository.repo,
			pull_number : pullNumber,
			per_page    : 100
		}
	);

	transformResponse(response);

	if (allFiles['en'] === undefined) {
		console.log('No modified/added keys in english locale');
		return;
	}

	const languages = inputs.langs.split(',').map(elem => elem.trim());
	let failFlag = false;

	const langNotPresent = languageCheck(languages);
	if (langNotPresent.length !== 0) {
		console.log('Languages not present: ', langNotPresent);
		failFlag = true;
	}

	for (const file in allFiles['en']) {
		const baseFile = await getFileContent(octokit, inputs.base_branch, repository, file);
		const targetFile = await getFileContent(octokit, inputs.target_branch, repository, file);

		const keyDifference = compareFiles(baseFile, targetFile);
		const absent = validateKeySync(keyDifference, file, languages);

		if (!_.isEmpty(absent['fileNotPresent'])) {
			console.log(file + ' not available for following languages: ' + absent['fileNotPresent']);
			failFlag = true;
		}

		if (!_.isEmpty(absent['keyNotPresent'])) {
			console.log(file + ' is missing following keys: \n' + JSON.stringify(absent['keyNotPresent']));
			failFlag = true;
		}
	}

	if (failFlag) {
		core.setFailed('Translations out of sync!');
	}
}

main();