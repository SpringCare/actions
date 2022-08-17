import {getFileContent, getFiles, getPRs, objectPaths} from '../utils/pullRequest';
import {Octokit} from '@octokit/core';

const core = require('@actions/core');
const github = require('@actions/github');

async function getChangedENFilesFromTargetBranch(octokit: Octokit, target_branch: string): Promise<Array<string>> {
	const pullRequest = await getPRs(octokit, target_branch);
	const pullNumber = pullRequest.data.number;

	const changedFiles = await getFiles(octokit, pullNumber);
	return changedFiles.data.filter(elem => new RegExp('.*/locales/en/.*.json').test(elem.filename)).map(file => file.split('/').slice(-1)[0]);
}

async function getFilesFromCurrentPR(octokit: Octokit, pullNumber: number) {
	const changedFiles = await getFiles(octokit, pullNumber);
	const filteredFiles = changedFiles.data.filter(elem => new RegExp('.*/locales/.*.json').test(elem.filename)).map(file => file.split('/').slice(-1)[0]);
	return [...new Set(filteredFiles)];
}

async function compareFiles(octokit: Octokit, file: string, inputs: { token: string; target_branch: string; base_branch: string; languages: string }): Promise<boolean> {
	for (const lang of inputs.languages) {
		const enFile = await getFileContent(octokit, inputs.target_branch, file);
		const otherFile = await getFileContent(octokit, inputs.base_branch, file, lang);

		const enKeys = Object.keys(objectPaths(enFile)).sort();
		const otherKeys = Object.keys(objectPaths(otherFile)).sort();

		if (JSON.stringify(enKeys) !== JSON.stringify(otherKeys))
			return false;
	}
}

async function main (): Promise<void> {
	const inputs: {
		token: string;
		target_branch: string;
		base_branch: string;
		languages: string;
	} = {
		token         : core.getInput('repo-token', { required: true }),
		target_branch : core.getInput('target-branch'),
		base_branch   : core.getInput('base-branch'),
		languages     : core.getInput('langs')
	};

	const pullNumber = github.context.payload.pull_request.number;
	const repository = github.context.repo;

	const octokit = new Octokit({ auth: inputs.token });

	const changedENFiles = await getChangedENFilesFromTargetBranch(octokit, inputs.target_branch);

	const files = await getFilesFromCurrentPR(octokit, pullNumber);

	for (const file in changedENFiles) {
		if (!files.includes(file) || !await compareFiles(octokit, file, inputs)) {
			core.setFailed('Translations in progress!');
			return;
		}
	}

	await octokit.request('PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge', {
		owner       : repository.owner,
		repo        : repository.repo,
		pull_number : pullNumber,
	});
}

main();