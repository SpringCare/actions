const core = require('@actions/core');
const github = require('@actions/github');

import { setState } from '../utils/pivotalTracker';

async function main(): Promise<void> {

	const targetBranch = github.context.ref;
	const text = github.context.payload.pull_request.body;
	const pivotalKey = core.getInput('pivotal-api-key');

	console.log('Target branch: ', targetBranch);

	if ((targetBranch === 'staging') && (text !== null)) {

		const regex = /((http|https):\/\/www.pivotaltracker.com)/g;
		const parsedUrls = text.match(regex);

		await parsedUrls.forEach((url: string) => {

			const storyId = url.split('/').slice(-1)[0];
			const webhookUrl = `https://www.pivotaltracker.com/services/v5/projects/2428649/stories/${storyId}`;

			setState(webhookUrl, pivotalKey);
		});
	}
}

// Call the main function.
main();
