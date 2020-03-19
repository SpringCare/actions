const core = require('@actions/core');
const github = require('@actions/github');

import axios from 'axios';

async function pivotalTracker(webhookUrl: string, pivotalKey: string): Promise<void> {

	// Determine story_type (chore, bug, feature)
	try {
		let story = await axios.get(webhookUrl, {
			headers: {
				'Content-Type'   : 'application/json',
				'X-TrackerToken' : pivotalKey,
			},
		});

		console.log('StoryType  ', story.data.story_type);

		let newState = story.data.story_type === 'chore' ? 'accepted' : 'finished';

		console.log('NewState  ', newState);

		let value = await axios.put(webhookUrl, {current_state: newState}, {
			headers: {
				'Content-Type'   : 'application/json',
				'X-TrackerToken' : pivotalKey,
			},
		});

		console.log('Value  ------   ', value);

	} catch(error) {
		console.log('ERROR: ', error);
	}
}

async function main(): Promise<void> {
	const targetBranch = github.context.ref;
	const text = github.context.payload.pull_request.body;
	const pivotalKey = core.getInput('pivotal-api-key');

	console.log('target branch: ', targetBranch);
	console.log('body text: ', text);

	if ((targetBranch === 'staging') && (text !== null)) {

		const regex = /(https?:\/\/[^\s]+)/g;
		const parsedUrls = text.match(regex);

		console.log('urls: ', parsedUrls);

		await parsedUrls.forEach((url: string) => {

			const storyId = url.split('/').slice(-1)[0];
			const webhookUrl = `https://www.pivotaltracker.com/services/v5/projects/2428649/stories/${storyId}`;

			console.log('storyId: ', storyId);

			pivotalTracker(webhookUrl, pivotalKey);
		});
	}
}

// Call the main function.
main();
