const core = require('@actions/core');
const github = require('@actions/github');

import { sendMessage } from '../utils/slack';
import { parseReviews } from '../utils/parseReviews';
import { getReviews } from '../utils/getReviews';

export async function pullRequestUnlabeled(context, inputs): Promise<void> {

	try {

		const label = context.payload.label.name;
		const pr = context.payload.pull_request;
		const pullNumber = pr.number;
		const pullUrl = pr.html_url;
		const token = inputs.token;

		console.log('PR number is', pullNumber);
		console.log('Inputs', inputs);
		console.log(token);

		const { data } = await getReviews(token, pullNumber);
		const activeReviews = parseReviews(data || []);
		const deniedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'changes_requested');

		console.log(activeReviews);
		console.log(deniedReviews);

		if (
			label === 'changes requested' && 
            (inputs.slackChannel || inputs.githubSlackMapping)
            && inputs.slackUrl
            && deniedReviews.length > 0
		) {
			const message = `Changes have been made to pull request <${pullUrl}|#${pullNumber}> in \`${github.context.repo.repo}\`. Please review.`;

			if (inputs.githubSlackMapping) {

				const mapping = JSON.parse(inputs.githubSlackMapping);
				const reviewers = deniedReviews.map(reviewer => reviewer.user);
				console.log(reviewers);

				for (let i = 0; i < reviewers.length; i++) {

					const slackUser = mapping[reviewers[i]];

					console.log(`Slacking reviewer: ${reviewers[i]} at slack ID: ${slackUser}`);

					if (!slackUser) {
						core.setFailed(`Couldn't find an associated slack ID for reviewer: ${reviewers[i]}`);
						return;
					}

					sendMessage(
						inputs.slackUrl,
						slackUser,
						message,
						inputs.botName,
						inputs.iconEmoji
					);
				}

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
	} catch(error) {
		console.log(error);
	}
}