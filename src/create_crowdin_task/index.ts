import {Tasks} from '@crowdin/crowdin-api-client';
import {addLabels} from '../utils/labeler';
import {Octokit} from '@octokit/core';

const github = require('@actions/github');
const {getInput} = require('@actions/core');
const crowdin = require('@crowdin/crowdin-api-client');

enum labels {
	InProgress = 'Translations in-progress'
}

async function createTask(tasksApi: Tasks, projectId: number, fileId: Array<number>, languages: string[], pullNumber: number): Promise<void> {
	// for (const lang of languages) {
	await tasksApi.addTask(projectId, {
		title                          : `#${pullNumber} - SH Translation Task`,
		type                           : 3,
		fileIds                        : fileId,
		languageId                     : 'de',
		vendor                         : 'oht',
		skipAssignedStrings            : true,
		skipUntranslatedStrings        : false,
		includeUntranslatedStringsOnly : true,
		description                    : ''
	});
	// }
}

async function getPullRequest(octokit: Octokit, repository: Record<string, any>, headBranch: string) {
	const prs = await octokit.request(
		'GET /repos/{owner}/{repo}/pulls{?state,head,base,sort,direction,per_page,page}', {
			headers: {
				Accept: 'application/vnd.github.v3.raw',
			},
			owner : repository.owner,
			repo  : repository.repo,
			base  : headBranch,
		});

	return JSON.parse(prs.data);
}

async function main (): Promise<void> {
	const inputs: {
		token: string;
		headBranch: string;
		crowdinToken: string;
		githubContext: string;
	} = {
		token         : getInput('repo-token', {required: true}),
		headBranch    : getInput('head-branch'),
		crowdinToken  : getInput('crowdin-token', {required: true}),
		githubContext : getInput('github_context', {required: true}),
	};

	const payload = JSON.parse(inputs.githubContext);

	const crowdinAPIs = new crowdin.default({token: inputs.crowdinToken});

	const fileId = payload.file.id;
	const projectId = payload.file.project.id;
	const targetLanguages = payload.file.project.targetLanguageIds;

	const {
		tasksApi
	} = crowdinAPIs;

	const client = new github.GitHub(inputs.token);
	const repository = github.context.repo;
	const octokit = new Octokit({ auth: inputs.token });
	const pullNumber = await getPullRequest(octokit, repository, inputs.headBranch);

	await createTask(tasksApi, projectId, fileId, targetLanguages, pullNumber);
	await addLabels(client, pullNumber, [labels.InProgress]);
}

main();