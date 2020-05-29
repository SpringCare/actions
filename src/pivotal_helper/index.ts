const core = require('@actions/core');
const github = require('@actions/github');

import { addLabels } from '../utils/labeler';
import { setState } from '../utils/pivotalTracker';

async function main(): Promise<void> {

	try {
		const targetBranch = github.context.ref;
		const pr = github.context.payload.pull_request;
		const pullNumber = pr.number;
		const text = github.context.payload.pull_request.body;
		const pivotalKey = core.getInput('pivotal-api-key');
		const repoToken = core.getInput('repo-token', { required: true });
		const client = new github.GitHub(repoToken);

		console.log('Target branch: ', targetBranch);

		if ((targetBranch === 'staging') && (text !== null)) {

			const regex = /((http|https):\/\/www.pivotaltracker.com\/story\/show\/[1-9]\d{6,})/g;
			const parsedUrls = text.match(regex) || [];

			// Adds label when PT url is not found in the PR description.
			if (!parsedUrls || parsedUrls.length === 0) {
				addLabels(
					client,
					pullNumber,
					['no-ticket']
				);
			}

			await parsedUrls.forEach((url: string) => {
				const storyId = url.split('/').slice(-1)[0];
				setState(storyId, pivotalKey);
			});
		}
	} catch(error) {
		console.log('ERROR: ', error);
	}
}

// Call the main function.
main();
