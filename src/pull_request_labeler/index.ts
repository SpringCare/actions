const core = require('@actions/core');
const github = require('@actions/github');

import { addLabels, removeLabel } from '../utils/labeler';
import { parseReviews } from '../utils/parseReviews';
import { getReviews } from '../utils/getReviews';
import makePrInBranchLabelManager from '../utils/prInBranchLabelManager';
import { Pr, PrLabelerInputs, Client, BranchLabelerInputs } from '../utils/types';

const handleReviewCountLabel = async (
	inputs: PrLabelerInputs,
	client: Client,
	pullNumber: string
): Promise<void> => {
	if (inputs.requiredReviews && !(inputs.requiredReviews > 0)) {
		core.setFailed('If set, "required" must be an integer greater than 0');
		return;
	}

	const { data } = await getReviews(inputs.token, pullNumber);

	if (inputs.requiredReviews > 0) {
		const activeReviews = parseReviews(data || []);
		const approvedReviews = activeReviews.filter(
			(r) => r.state.toLowerCase() === 'approved'
		);

		console.log('active', activeReviews);

		let reviewCount = approvedReviews.length;
		if (reviewCount > inputs.requiredReviews) {
			reviewCount = inputs.requiredReviews;
		}

		const toAdd = `${reviewCount} of ${inputs.requiredReviews}`;

		// Loop through the current labels and remove any existing "x of y" labels
		for (let i = 0; i <= inputs.requiredReviews; i++) {
			// When removing, we need to escape special characters
			const loopCount = `${i}%20of%20${inputs.requiredReviews}`;

			// Don't remove the one we're trying to add, just in case a race condition happens on the server
			if (i !== reviewCount) {
				removeLabel(client, pullNumber, loopCount);
			}
		}

		addLabels(client, pullNumber, [toAdd]);
	}
};

const handleWIPLabel = (inputs: PrLabelerInputs, client: Client, pr: Pr): void => {
	const draftPR = pr.draft;
	const pullNumber = pr.number;
	if (inputs.labelWIP && draftPR) {
		addLabels(client, pullNumber, ['WIP']);
	} else if (inputs.labelWIP && !draftPR) {
		removeLabel(client, pullNumber, 'WIP');
	}
};

const handleBranchLabel = async (inputs: PrLabelerInputs, pr: Pr): Promise<void> => {
	const prInBranchLabelManager = makePrInBranchLabelManager(inputs as BranchLabelerInputs);

	const branchCommits = await prInBranchLabelManager.getBranchCommits(inputs.branch);

	prInBranchLabelManager.addOrRemoveBranchLabel(pr, branchCommits);
};

async function main(): Promise<void> {
	// Get a few inputs from the GitHub event.
	const inputs: PrLabelerInputs = {
		token           : core.getInput('repo-token', { required: true }),
		requiredReviews : core.getInput('required'),
		labelWIP        : core.getInput('wip'),
		branch          : core.getInput('target-branch'),
		label           : core.getInput('label'),
		color           : core.getInput('color'),
	};

	const pr = github.context.payload.pull_request;
	if (!pr) {
		core.setFailed(
			'This action must be run with only "pull_request" or "pull_request_review".'
		);
		return;
	}
	const pullNumber = pr.number;

	console.log('PR number is', pullNumber);
	console.log('Inputs', inputs);

	const client = new github.GitHub(inputs.token);

	handleReviewCountLabel(inputs, client, pullNumber);

	handleWIPLabel(inputs, client, pr);

	handleBranchLabel(inputs, pr);
}

// Call the main function.
main();
