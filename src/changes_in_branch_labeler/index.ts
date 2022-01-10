const core = require('@actions/core');
const github = require('@actions/github');

import { Octokit } from '@octokit/core';
import { addLabels, removeLabel } from '../utils/labeler';

async function main(): Promise<void> {
	const inputs: {
		token: string;
		branch: string;
	} = {
		token: core.getInput('repo-token', { required: true }),
		branch: core.getInput('target-branch'),
	};

	const octokit = new Octokit({ auth: inputs.token });

	const headCommitSha = github.context.payload.head_commit.id;
	const commitsUrl = github.context.payload.repository.commits_url.split('{/')[0];

	const commitResponse = await octokit.request(
		`GET ${commitsUrl}/${headCommitSha}?sha=${inputs.branch}`
	);
	const commit = commitResponse.data;

	let prHeadCommitSha = headCommitSha;
	if (commit.parents.length > 1) {
		prHeadCommitSha = commit.parents[1].sha;
	}

	const prsForCommitResponse = await octokit.request(
		`GET ${commitsUrl}/${prHeadCommitSha}/pulls`
	);
	const prsForCommit = prsForCommitResponse.data;
	const formattedPrs = prsForCommit.map((pr) => {
		return { number: pr.number, title: pr.title };
	});
	console.log('PRs: ', formattedPrs);

	const client = new github.GitHub(inputs.token);

	prsForCommit.forEach((pr) => {
		const pullNumber = pr.number;
		const prLabels = pr.labels.map((label) => label.name);

		const showBranchLabel = pr.head.sha === prHeadCommitSha;

		const label = `Changes in ${inputs.branch}`;

		if (!showBranchLabel && prLabels.includes(label)) {
			removeLabel(client, pullNumber, label);
		}

		if (showBranchLabel) {
			addLabels(client, pullNumber, [label]);
		}
	});
}

main();
