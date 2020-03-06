const github = require('@actions/github');
const core = require('@actions/core');

import { addLabels, removeLabel } from '../utils/labeler';
import { sendMessage } from '../utils/slack';
import { parseReviews } from '../utils/parseReviews';


export async function pullRequestSubmitted(context, inputs) {

    console.log('In action ==== pullRequestSubmitted');

    const pr = context.payload.pull_request;
    const review = context.payload.review;
    const pullNumber = pr.number;
	const pullUrl = pr.html_url;
	const author = pr.user.id;
	const state = review.state;

    console.log('PR number is', pullNumber);
	console.log('Config', config);
    console.log('Inputs', inputs);
    
	const client = new github.GitHub(inputs.token);

	const { data } = await client.pulls.listReviews({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		// eslint-disable-next-line @typescript-eslint/camelcase
		pull_number: pullNumber,
	});

	const activeReviews = parseReviews(data || []);
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