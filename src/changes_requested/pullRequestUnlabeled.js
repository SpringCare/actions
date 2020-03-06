const github = require('@actions/github');
const core = require('@actions/core');

import { sendMessage } from '../utils/slack';
import { getReviews } from '../utils/getReviews';
import { parseReviews } from '../utils/parseReviews';


export async function pullRequestUnlabeled(context, inputs) {

    try {

        const pr = context.payload.pull_request;
        const pullNumber = pr.number;
        const pullUrl = pr.html_url;

        console.log('Action ==== unlabeled');
        console.log('Payload', context.payload)
        console.log('PR number is', pullNumber);
        console.log('Inputs', inputs);
        
        const { data } = getReviews(inputs, pullNumber);
        const activeReviews = parseReviews(data || []);
        const deniedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'changes_requested');

        if (
            inputs.alertOnRemoved &&
        	(inputs.slackChannel || inputs.githubSlackMapping)
            && inputs.slackUrl
            && deniedReviews.length > 0
        ) {
        	const message = `Changes have been made to pull request <${pullUrl}|#${pullNumber}> in \`${github.context.repo.repo}\`. Please review.`;

        	if (inputs.githubSlackMapping) {

                const mapping = JSON.parse(inputs.githubSlackMapping);
                const reviewers = deniedReviews.map(reviewer => reviewer.user);

                for (let i = 0; i < reviewers.length; i++) {

                    const slackUser = mapping[reviewers[i]];

                    console.log(`Slacking reviewer: ${reviewer[i]} at slack ID: ${slackUser}`);

                    if (!slackUser) {
                        core.setFailed(`Couldn't find an associated slack ID for reviewer: ${reviewer[i]}`);
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
        		// sendMessage(
        		// 	inputs.slackUrl,
        		// 	inputs.slackChannel,
        		// 	message,
        		// 	inputs.botName,
        		// 	inputs.iconEmoji
        		// );
        	}
        }
    } catch(error) {
        console.log(error);
    }
}