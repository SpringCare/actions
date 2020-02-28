const core = require('@actions/core');
const github = require('@actions/github');

const verifyConfig = require('../utils/verifyConfig');
import { addLabels, removeLabel } from '../utils/labeler';

// Call the main function.
main();

function parseReviews(reviews = []) {
	//TODO: Add argument for states to care about

	// grab the data we care about
	const parsed = reviews.map(r => ({
		state: r.state,
		user: r.user.id,
		submitted: new Date(r.submitted_at),
	}));

	const data = {};

	// group reviews by review author, and only keep the newest review
	parsed.forEach((p) => {
		// we only care about reviews that are approved or denied.
		if (p.state.toLowerCase() !== 'approved' && p.state.toLowerCase() !== 'changes_requested') {
			return;
		}

		// Check if the new item was submitted AFTER
		// the already saved review.  If it was, overwrite
		if (data[p.user]) {
			const submitted = data[p.user].submitted;
			data[p.user] = submitted > p.submitted ? data[p.user] : p;
		} else {
			data[p.user] = p;
		}
	});

	return Object.keys(data).map(k => data[k]);
}

async function main() {
	// Grab the config variables. Abort if they're unavailable.
	const config = verifyConfig();

	// Get a few inputs from the GitHub event.
	const inputs: {
		token: string;
		requiredReviews: number;
		labelWIP: boolean;
	} = {
		token: core.getInput('repo-token', { required: true }),
		requiredReviews: core.getInput('required'),
		labelWIP: core.getInput('wip'),
	};

	const pr = github.context.payload.pull_request;
	if (!pr) {
		core.setFailed('This action must be run with only "pull_request" or "pull_request_review".');
		return;
	}
	const pullNumber = pr.number;
	const draftPR = pr.draft;

	console.log('PR number is', pullNumber);
	console.log('Config', config);
	console.log('Inputs', inputs);

	if (inputs.requiredReviews && !(inputs.requiredReviews > 0)) {
		core.setFailed('If set, "required" must be an integer greater than 0');
		return;
	}

	const client = new github.GitHub(inputs.token);

	const { data } = await client.pulls.listReviews({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		pull_number: pullNumber,
	});

	if (inputs.requiredReviews > 0) {
		const activeReviews = parseReviews(data || []);
		const approvedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'approved');

		console.log('active', activeReviews);

		let reviewCount = approvedReviews.length;
		if (reviewCount > inputs.requiredReviews) {
			reviewCount = inputs.requiredReviews;
		}

		const toAdd = `${reviewCount} of ${inputs.requiredReviews}`;

		// Loop through the current labels and remove any existing "x of y" labels
		for (let i = 0; i <= inputs.requiredReviews; i++) {
			const loopCount = `${i}%20of%20${inputs.requiredReviews}`;

			// Don't remove the one we're trying to add, just in case a race condition happens on the server
			if (loopCount !== toAdd) {
				removeLabel(
					client,
					pullNumber,
					loopCount
				);
			}
		}

		addLabels(
			client,
			pullNumber,
			[toAdd]
		);
	}

	if (inputs.labelWIP && draftPR) {
		addLabels(
			client,
			pullNumber,
			['WIP']
		);
	} else if (inputs.labelWIP && !draftPR) {
		removeLabel(
			client,
			pullNumber,
			'WIP'
		);

	}
}