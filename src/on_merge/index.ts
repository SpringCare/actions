const core = require('@actions/core');
const github = require('@actions/github');

import axios from 'axios';

async function pivotalTracker(webhookUrl: string, pivotalKey: string): Promise<void> {
	try {
		await axios.put(webhookUrl, { workflow: 'finish' }, {
			headers: {
				'Content-Type'   : 'application/json',
				'X-TrackerToken' : pivotalKey,
			},
		});
	} catch(error) {
		console.log('ERROR: ', error);
	}
}

async function main(): Promise<void>{
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


// 1. Get target branch (staging || master)
// 2. Determine target PT workflow change (finish || deliver)
// 3. Parse link from PR body (PT Ticket ###)
// 4. Setup PT Connection
// a. Update PT Ticket ### with new workflow (finish || deliver)



// PUT /projects/2428649/stories/{story_id}
// current_state -> accepted, delivered, finished
// axios