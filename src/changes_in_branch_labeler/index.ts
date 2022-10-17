import GithubAPI from '../utils/githubAPI';

const core = require('@actions/core');

import ChangesInTargetBranchLabeler from '../utils/changesInTargetBranchLabeler';
import { BranchLabelerInputs } from '../utils/types';

async function main(): Promise<void> {
	const inputs: BranchLabelerInputs = {
		token    : core.getInput('repo-token', { required: true }),
		branches : core.getInput('target-branch'),
		color    : core.getInput('color'),
	};
	const gitAPI = GithubAPI(inputs.token);

	const changesInTargetBranchLabeler = ChangesInTargetBranchLabeler(inputs);

	const openPrs = await gitAPI.openPRs();

	for (const pr of openPrs) {
		changesInTargetBranchLabeler.manageLabel(pr);
	}
}

main();
