const core = require('@actions/core');
const github = require('@actions/github');

const verifyConfig = require('../utils/verifyConfig');

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

async function addLabels(client, prNumber, labels) {
	console.log('Adding labels:', labels);

	await client.issues.addLabels({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		issue_number: prNumber,
		labels: labels
	});
}

async function removeLabel(client, prNumber, label) {
	console.log('Removing label:', label);

	await client.issues.addLabels({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		issue_number: prNumber,
		name: label
	});
}

async function main() {
	// Grab the config variables. Abort if they're unavailable.
	const config = verifyConfig();

	// Get a few inputs from the GitHub event.
	const inputs = {
		token: core.getInput('repo-token', { required: true }),
		requiredReviews: core.getInput('required'),
		alertChangesRequested: core.getInput('alert-on-changes-requested')
	};

	const pr = github.context.payload.pull_request;
	if (!pr) {
		core.setFailed('This action must be run with only "pull_request" or "pull_request_review".');
		return;
	}
	const pull_number = pr.number;

	console.log('PR number is', pull_number);
	console.log('Config', config);
	console.log('Inputs', inputs);

	if (inputs.requredReviews && !inputs.requiredReviews > 0) {
		core.setFailed('If set, "required" much be an integer greater than 0');
		return;
	}

	const client = new github.GitHub(inputs.token);

	const { data } = await client.pulls.listReviews({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		pull_number,
	});

	const activeReviews = parseReviews(data || []);
	const approvedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'approved');
	const deniedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'changes_requested');

	console.log('active', activeReviews);
	console.log('denied', deniedReviews.length);

	console.log('alert', inputs.alertChangesRequested);

	if (inputs.alertChangesRequested && deniedReviews > 0) {
		addLabels(
			client,
			pull_number,
			['changes requested']
		);
	}

	if (inputs.alertChangesRequested && deniedReviews === 0) {
		removeLabel(
			client,
			pull_number,
			'changes%20requested'
		);
	}

	if (inputs.requiredReviews > 0) {
		// Loop through the current labels and remove any existing "x of y" labels
		for (let i = 0; i <= inputs.requiredReviews; i++) {
			removeLabel(
				client,
				pull_number,
				`${i}%20of%20${inputs.requiredReviews}`
			);
		}

		addLabels(
			client,
			pull_number,
			[`${approvedReviews.length} of ${inputs.requiredReviews}`]
		);
	}
}