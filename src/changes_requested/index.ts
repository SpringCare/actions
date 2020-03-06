const core = require('@actions/core');
const github = require('@actions/github');

const verifyConfig = require('../utils/verifyConfig');
import { addLabels, removeLabel } from '../utils/labeler';
import { sendMessage } from '../utils/slack';
import { parseReviews } from '../utils/parseReviews';
import { getReviews } from '../utils/getReviews';
/// CREATE: Pull request submitted
/// CREATE: Pull request unlabeled


async function main(): Promise<{}> {
	// Grab the config variables. Abort if they're unavailable.
	const config = verifyConfig();

	// // Get a few inputs from the GitHub event.
	const inputs = {
		token: core.getInput('repo-token', { required: true }),
		labelChangesRequested: core.getInput('label-on-changes-requested'),
		alertOnRemoved: core.getInput('alert-on-label-removed'),
		slackUrl: core.getInput('slack-webhook-url'),
		slackChannel: core.getInput('slack-channel'),
		botName: core.getInput('bot-name'),
		iconEmoji: core.getInput('icon_emoji'),
		githubSlackMapping: core.getInput('github-slack-mapping'),
	};

	const client = new github.GitHub(inputs.token);

	////// 1. check to see if label was removed ////// 
	// if event === pull_request && action === submitted
	// else if action === unlabeled

	////// 2. get all reviews ////// 
	// const { data } = await client.pulls.listReviews({
	// 	owner: github.context.repo.owner,
	// 	repo: github.context.repo.repo,
	// 	pull_number: pullNumber,
	// });

	////// 3. filter only active requests for change ////// 
	//  parseReviews()

	////// 4. get github ID for negative reviewers ////// 


	////// 5. send out slack message with link to this PR ////// 


	const pr = github.context.payload.pull_request;
	const review = github.context.payload.review;
	const event = github.context.eventName;
	const action = github.context.payload.action;

	console.log(event)
	console.log(action)


	if (!pr) {
		core.setFailed('This action must be run with only "pull_request_review".');
		return;
	}


	const pullNumber = pr.number;
	const pullUrl = pr.html_url;
	const author = pr.user.id;
	const state = review.state;

	console.log('PR number is', pullNumber);
	console.log('Config', config);
	console.log('Inputs', inputs);

    const data = getReviews(inputs, pullNumber);
	const activeReviews = parseReviews(data);
	const deniedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'changes_requested');

	console.log('denied', deniedReviews.length);
	console.log('alert', inputs.labelChangesRequested);

	if (inputs.labelChangesRequested && state === 'changes_requested') {
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

	if (
		state === 'changes_requested' &&
		(inputs.slackChannel || inputs.githubSlackMapping)
		&& inputs.slackUrl
	) {
		const message = `Changes have been requested on pull request <${pullUrl}|#${pullNumber}> in \`${github.context.repo.repo}\`.`;

		if (inputs.githubSlackMapping) {
			const mapping = JSON.parse(inputs.githubSlackMapping);
			const slackUser = mapping[author];

			console.log(`Slacking author: ${author} at slack ID: ${slackUser}`);

			if (!slackUser) {
				core.setFailed(`Couldn't find an associated slack ID for user: ${author}`);
				return;
			}

			sendMessage(
				inputs.slackUrl,
				slackUser,
				message,
				inputs.botName,
				inputs.iconEmoji
			);

		} else if (inputs.slackChannel) {
			sendMessage(
				inputs.slackUrl,
				inputs.slackChannel,
				message,
				inputs.botName,
				inputs.iconEmoji
			);
		}
	}
}

// Call the main function.
main();
