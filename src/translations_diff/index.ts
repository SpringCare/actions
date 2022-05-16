const core = require('@actions/core');
const github = require('@actions/github');

import { Octokit } from '@octokit/core';

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

function compareFiles(file: string, lang = 'en'): void {

	// error if not lang or file not present
	// else check content of one file with another
	const enFilePatchKeys = extractKeys(file, allFiles[lang][file]);
	let notExistsFlag: boolean = true;
	let keyMismatchFlag: boolean = true;

	let notExists = [];
	let keysNotMatching = [];

	for (const lang of languages) {
		if (allFiles[lang] === undefined || allFiles[lang][file] === undefined) {
			notExistsFlag = false;
			notExists.push(file);
		}	

		const otherLangFileKeys = extractKeys(file, allFiles[lang][file]);

		if (!(compareKeys(enFilePatchKeys, otherLangFileKeys))) {
			keyMismatchFlag = false;
			keysNotMatching.push(lang)
		}
	}

	if (!notExistsFlag) {
		console.log("Language or file not does not exists:");
		console.log(notExists);
	}

	if (!keyMismatchFlag) {
		console.log("\nKeys not matching:");
		console.log(keysNotMatching);
	}

	return null;
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

	console.log('Check here');
	console.log(allFiles);
	for (const file in allFiles['en']) {
		console.log(file, ' ', compareFiles(file));
	}

	if (compareFiles === undefined)
		core.setFailed("Failed!");
}

main();