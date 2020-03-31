const core = require('@actions/core');
const github = require('@actions/github');

import { setState } from '../utils/pivotalTracker';

async function main(): Promise<void> {

	const targetBranch = github.context.ref;
	const text = github.context.payload.pull_request.body;
	const pivotalKey = core.getInput('pivotal-api-key');

	console.log('Target branch: ', targetBranch);

	if ((targetBranch === 'staging') && (text !== null)) {

		const regex = /((http|https):\/\/www.pivotaltracker.com\/story\/show\/[1-9]\d{6,})/g;
		const parsedUrls = text.match(regex);

		console.log(parsedUrls);

		await parsedUrls.forEach((url: string) => {

			const storyId = url.split('/').slice(-1)[0];
			setState(storyId, pivotalKey);
		});
	}
}

// Call the main function.
main();
