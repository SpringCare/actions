const core = require('@actions/core');
const github = require('@actions/github');

import { sendMessage } from '../utils/slack';
import { parseReviews } from '../utils/parseReviews';
import { getReviews } from '../utils/getReviews';

export async function pullRequestApproved(context, inputs): Promise<void> {

	try {

		const pr = context.payload.pull_request;
		const review = context.payload.review;
		const pullNumber = pr.number;
		const pullUrl = pr.html_url;
		const author = pr.user.id;
		const state = review.state;
		const token = inputs.token;

		console.log('PR number is', pullNumber);
		console.log('Inputs', inputs);

		const { data } = await getReviews(token, pullNumber);
		const activeReviews = parseReviews(data || []);
		const approvedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'approved');
		const approver = activeReviews.filter((r) => r.user);

		console.log('denied', approvedReviews.length);
		console.log('alert', inputs.labelpullRequestApproved);

		if (
			state === 'approved' &&
			(inputs.slackChannel || inputs.githubSlackMapping) &&
			inputs.slackUrl
		) {
			const message = `Your pull request <${pullUrl}|#${pullNumber}> in \`${github.context.repo.repo}\` has been approved by ${approver}!`;

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
	} catch(error) {
		console.log(error);
	}

}