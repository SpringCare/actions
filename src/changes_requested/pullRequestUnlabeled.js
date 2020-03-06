const github = require('@actions/github');
const core = require('@actions/core');

import { sendMessage } from '../utils/slack';
import { parseReviews } from '../utils/parseReviews';


export async function pullRequestUnlabeled(context, inputs) {

    try {

        const label = context.payload.label.name;
        const pr = context.payload.pull_request;
        const pullNumber = pr.number;
        const pullUrl = pr.html_url;

        console.log('Action ==== unlabeled');
        console.log('PR number is', pullNumber);
        console.log('Inputs', inputs);
        console.log(label);
        
        const client = new github.GitHub(inputs.token);
        console.log(client)
        console.log('TEST!!')

        const { data } = client.pulls.listReviews({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            // eslint-disable-next-line @typescript-eslint/camelcase
            pull_number: pullNumber,
        });

        console.log('DATA   ', data)

        const activeReviews = parseReviews(data || []);
        console.log(activeReviews)
        const deniedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'changes_requested');
        console.log(deniedReviews)

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

                for (let i = 0; i < reviewers.length; i++) {

                    const slackUser = mapping[reviewers[i]];

                    console.log(`Slacking reviewer: ${reviewers[i]} at slack ID: ${slackUser}`);

                    if (!slackUser) {
                        core.setFailed(`Couldn't find an associated slack ID for reviewer: ${reviewers[i]}`);
                        return;
                    }

                    // sendMessage(
                    //     inputs.slackUrl,
                    //     slackUser,
                    //     message,
                    //     inputs.botName,
                    //     inputs.iconEmoji
                    // );
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