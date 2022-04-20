const core = require('@actions/core');

import makePrInBranchLabelManager from '../utils/prInBranchLabelManager';
import { Pr, Commit, BranchLabelerInputs } from '../utils/types';

async function main(): Promise<void> {
	const inputs: BranchLabelerInputs = {
		token  : core.getInput('repo-token', { required: true }),
		branch : core.getInput('target-branch'),
		label  : core.getInput('label'),
		color  : core.getInput('color'),
	};

	const prInBranchLabelManager = makePrInBranchLabelManager(inputs);

	const openPrs = await prInBranchLabelManager.getOpenPrs();

	const branchCommits: Commit[] = await prInBranchLabelManager.getBranchCommits(inputs.branch);

	openPrs.forEach(async (pr: Pr) => {
		prInBranchLabelManager.addOrRemoveBranchLabel(pr, branchCommits);
	});
}

main();
