const core = require('@actions/core');
const github = require('@actions/github');

const verifyConfig = require('../utils/verifyConfig');
import { addLabels, removeLabel } from '../utils/labeler';
import { sendMessage } from '../utils/slack';

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
		token: core.getInput('repo-token', { required: true }),
		labelChangesRequested: core.getInput('label-on-changes-requested'),
		slackUrl: core.getInput('slack-webhook-url'),
		slackChannel: core.getInput('slack-channel'),
		botName: core.getInput('bot-name'),
		iconEmoji: core.getInput('icon_emoji'),
	};

	const pr = github.context.payload.pull_request;
	if (!pr) {
		core.setFailed('This action must be run with only "pull_request_review".');
		return;
	}
	const pullNumber = pr.number;
	const pullUrl = pr.url;

	console.log('PR number is', pullNumber);
	console.log('Config', config);
	console.log('Inputs', inputs);

	const client = new github.GitHub(inputs.token);

	const { data } = await client.pulls.listReviews({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		pull_number: pullNumber,
	});

	const activeReviews = parseReviews(data || []);
	const deniedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'changes_requested');

	console.log('denied', deniedReviews.length);
	console.log('alert', inputs.labelChangesRequested);

	if (inputs.labelChangesRequested && deniedReviews.length > 0) {
		addLabels(
			client,
			pullNumber,
			['changes requested']
		);
	}

	if (inputs.labelChangesRequested && deniedReviews.length === 0) {
		removeLabel(
			client,
			pullNumber,
			'changes%20requested'
		);
	}

	if (inputs.slackChannel && inputs.slackUrl) {
		sendMessage(
			inputs.slackUrl,
			inputs.slackChannel,
			`Changes have been requested on pull request <${pullUrl}|#${pullNumber}> in ${github.context.repo.repo}.`,
			inputs.botName,
			inputs.iconEmoji
		);
	}
}

// Call the main function.
main();