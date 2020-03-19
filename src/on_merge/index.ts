const github = require('@actions/github');
import axios from 'axios';

function pivotalTracker(webhookUrl: string): void {
	axios.put(webhookUrl, {
		workflow: 'finish',
	});
}


async function main(): Promise<void>{
	const targetBranch = github.context.ref;
	const text = github.context.payload.pull_request.body;

	console.log('target branch: ', targetBranch);
	console.log('body text: ', text);


	const urlRegex = /(https?:\/\/[^\s]+)/g;
	const urls = text.match(urlRegex);

	console.log('urls: ', urls);

	urls.forEach((url: string) => {
		const storyId = url.split('/').slice(-1)[0];
		const webhookUrl = `https://www.pivotaltracker.com/services/v5/projects/2428649/stories/${storyId}`;

		console.log('storyId: ', storyId);

		pivotalTracker(webhookUrl);
	});
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