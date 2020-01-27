const core = require('@actions/core');
const { request } = require("@octokit/request");

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

async function main() {
	// Grab the config variables. Abort if they're unavailable.
	const config = verifyConfig();

	// Get a few inputs from the GitHub event.
	const inputs = {
		number: core.getInput('number'),
		requiredReviews: core.getInput('required'),
		alertChangesRequested: core.getInput('alert-on-changes-requested')
	};

	if (inputs.requredReviews && !inputs.requiredReviews > 0) {
		core.setFailed('"required" much be an integer greater than 0');
		return;
	}

	await request(
		`GET /repos/${config.repo}/pulls/${inputs.number}`,
		{ headers: { authorization: `token ${config.token}`} }
	);

	const allReviews = await request(
		`GET /repos/${config.repo}/pulls/${inputs.number}/reviews`,
		{ headers: { authorization: `token ${config.token}`} }
	);

	const activeReviews = parseReviews(allReviews);
	const approvedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'approved');
	const deniedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'changes_requested');

	if (inputs.alertChangesRequested && deniedReviews > 0) {
		request(
			`POST /repos/${config.repo}/issues/${inputs.number}/labels`,
			{
				headers: { authorization: `token ${config.token}`},
				labels: ['changes requested']
			}
		);
	}

	if (inputs.alertChangesRequested && deniedReviews === 0) {
		request(
			`DELETE /repos/${config.repo}/issues/${inputs.number}/labels/changes%20requested`,
			{ headers: { authorization: `token ${config.token}`} }
		);
	}

	if (inputs.requiredReviews > 0) {
		// Loop through the current labels and remove any existing "x of y" labels
		for (let i = 0; i <= inputs.requredReviews; i++) {
			request(
				`DELETE /repos/${config.repo}/issues/${inputs.number}/labels/${i} of ${inputs.requiredReviews}`,
				{ headers: { authorization: `token ${config.token}`} }
			);
		}

		request(
			`POST /repos/${config.repo}/issues/${inputs.number}/labels`,
			{
				headers: { authorization: `token ${config.token}`},
				labels: [`${approvedReviews.length} of ${inputs.requiredReviews}`]
			}
		);
	}
}