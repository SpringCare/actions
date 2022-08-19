import {getFileContent, getFiles, getPRs, objectPaths} from '../utils/pullRequest';
import {Octokit} from '@octokit/core';

const core = require('@actions/core');
const github = require('@actions/github');

async function getChangedENFilesFromBaseBranch(octokit: Octokit, base_branch: string): Promise<Array<string>> {
	const pullRequest = await getPRs(octokit, base_branch);
	const pullNumber = pullRequest.data[0].number;

	const changedFiles = await getFiles(octokit, pullNumber);
	return changedFiles.data.filter(elem => new RegExp('.*/locales/en/.*.json').test(elem.filename)).map(file => file.split('/').slice(-1)[0]);
}

async function getFilesFromCurrentPR(octokit: Octokit, pullNumber: number) {
	const changedFiles = await getFiles(octokit, pullNumber),
		filteredFiles = changedFiles.data.filter(elem => new RegExp('.*/locales/.*.json').test(elem.filename)),
		filesStructured: Record<string, Array<string>> = {};

	for (const file in filteredFiles) {
		const split = file.split('/').slice(-2);
		const locale = split[0];
		const fileName = split[1];

		if (filesStructured[locale] === undefined)
			filesStructured[locale] = [];

		filesStructured[locale].push(fileName);
	}
	return filesStructured;
}

async function compareFiles(octokit: Octokit, file: string, base_branch: string, inputs: { token: string; head_branch: string; languages: string }): Promise<boolean> {
	for (const lang of inputs.languages) {
		const enFile = await getFileContent(octokit, base_branch, file);
		const otherFile = await getFileContent(octokit, inputs.head_branch, file, lang);

		const enKeys = Object.keys(objectPaths(enFile)).sort();
		const otherKeys = Object.keys(objectPaths(otherFile)).sort();

		if (JSON.stringify(enKeys) !== JSON.stringify(otherKeys))
			return false;
	}
	return true;
}

function fileExists(files: Record<string, Array<string>>, file: string, languages: string) {
	for (const lang of languages) {
		if (files[lang] === undefined || !files[lang].includes(file)) {
			return false;
		}
	}
	return true;
}

async function main (): Promise<void> {
	const inputs: {
		token: string;
		head_branch: string;
		languages: string;
	} = {
		token       : core.getInput('repo-token', { required: true }),
		head_branch : core.getInput('head-branch'),
		languages   : core.getInput('langs')
	};

	const octokit = new Octokit({ auth: inputs.token });

	const crowdinPR = await getPRs(octokit, inputs.head_branch);
	const pullNumber = crowdinPR.data[0].number;
	const base_branch = crowdinPR.data[0].base.ref; //filter on branch

	const changedENFiles = await getChangedENFilesFromBaseBranch(octokit, base_branch);

	const files = await getFilesFromCurrentPR(octokit, pullNumber);

	for (const file in changedENFiles) {
		if (!fileExists(files, file, inputs.languages) || !await compareFiles(octokit, file, base_branch, inputs)) {
			core.setFailed('Translations in progress!');
			return;
		}
	}

	await octokit.request('PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge', {
		owner       : github.context.repo.owner,
		repo        : github.context.repo.repo,
		pull_number : pullNumber,
	});
}

main();