const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');

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
function transformResponse(response: Record<string, any>, isBackend: boolean): void {
	const fileRegex = isBackend? '.*/locales/.*.yml' : '.*/locales/.*.json';
	const filesFromResponse = response.data.filter(elem => new RegExp(fileRegex).test(elem.filename));

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

async function getFileContent(octokit: Octokit, branch: string, file: string, isBackend: boolean, locale = 'en') {
	const localesDir = isBackend? 'config/locales' : 'packages/cherrim/src/public/locales';
	const content = await octokit.request(
		'GET /repos/{owner}/{repo}/contents/{path}?ref={target_branch}', {
			headers: {
				Accept: 'application/vnd.github.v3.raw',
			},
			owner         : github.context.repo.owner,
			repo          : github.context.repo.repo,
			path          : `${localesDir}/${locale}/${file}`,
			target_branch : branch
		}
	);

	const fileContent = isBackend? yaml.load(content.data)[locale] : JSON.parse(content.data);
	return fileContent;
}

async function main (): Promise<void> {
	const inputs: {
		token: string;
		base_branch: string;
		target_branch: string;
		langs: string;
        is_backend: boolean;
	} = {
		token         : core.getInput('repo-token', { required: true }),
		base_branch   : core.getInput('base-branch'),
		target_branch : core.getInput('target-branch'),
		langs         : core.getInput('langs'),
		is_backend    : core.getInput('is-backend') || false
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

	transformResponse(response, inputs.is_backend);

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
		const baseFile = await getFileContent(octokit, inputs.base_branch, file, inputs.is_backend);
		const targetFile = await getFileContent(octokit, inputs.target_branch, file, inputs.is_backend);

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
