const core = require('@actions/core');
const github = require('@actions/github');

import { Octokit } from '@octokit/core';
import _ from 'lodash';

const allFiles = {};

const languages = ['es', 'pt'];

function compareKeys(enKeys: Record<string, any>, otherKeys: Record<string, any>): boolean {
	return (enKeys['added'].toString() === otherKeys['added'].toString()) &&
	(enKeys['deleted'].toString() === otherKeys['deleted'].toString());
}

function extractKeys(filename: string, patch: string): Record<string, any> {
	const regExpPlus = /(?<=\+).*(?=:)/g;
	const regExpMinus = /(?<=-).*(?=:)/g;

	const addedKeys = patch.match(regExpPlus);
	const deletedKeys = patch.match(regExpMinus);

	return {
		added   : addedKeys,
		deleted : deletedKeys,
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

	return difference;
}

async function main (): Promise<void> {
	console.log('Starting');

	const inputs: {
		token: string;
	} = { token: core.getInput('repo-token', { required: true }) };

	const pullNumber = github.context.payload.pull_request.number;
	const repository = github.context.repo;

	const octokit = new Octokit({ auth: inputs.token });

	const resp = await octokit.request(
		'GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
			owner       : repository.owner,
			repo        : repository.repo,
			pull_number : pullNumber
		}
	);

	console.log('Response: ', resp);

	const filesFromResponse = resp.data.filter(elem => new RegExp('.*.json').test(elem.filename));

	// returns an file: patch object for lang keys
	/**
	* {
	*  en: {
	*    file1: patch1,
	*    file2: patch2
	*  },
	* es: {
	*    file1: patch1
	* }
	* }
	*/
	filesFromResponse.forEach(element => {
		const path = element.filename.split('/');
		const n = path.length;
		const lang = path[n - 2];
		const filename = path[n - 1];

		if (!(lang in allFiles)) {
			allFiles[lang] = {};
		}
		allFiles[lang][filename] = element.patch;
	});
}

main();