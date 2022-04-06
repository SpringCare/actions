const core = require('@actions/core');
const github = require('@actions/github');

import { Octokit } from '@octokit/core';
import { createLabel } from '../utils/labeler';
import { getOpenPrs, getBranchCommits, addOrRemoveBranchLabel } from '../utils/prInBranchLabelerHelper';
import { Pr, Commit, BranchLabelerInputs } from '../utils/types';

async function main(): Promise<void> {
	const inputs: BranchLabelerInputs = {
		token  : core.getInput('repo-token', { required: true }),
		branch : core.getInput('target-branch'),
		label  : core.getInput('label'),
		color  : core.getInput('color'),
	};

	const octokit = new Octokit({ auth: inputs.token });

	const repository = github.context.repo;

	const openPrs = await getOpenPrs(octokit, repository);

	const branchCommits: Commit[] = await getBranchCommits(
		octokit,
		repository,
		inputs.branch
	);

	const client = new github.GitHub(inputs.token);

	await createLabel(octokit, inputs);

	openPrs.forEach(async (pr: Pr) => {
		addOrRemoveBranchLabel(inputs, client, octokit, pr, branchCommits);
	});
}

main();
