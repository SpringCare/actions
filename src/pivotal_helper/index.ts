const core = require('@actions/core');
const github = require('@actions/github');

import { noTicketCheck } from './noTicketCheck';
import { updateTicketState } from './updateTicketState';


async function main(): Promise<void> {

	// Get a few inputs from the GitHub event.
	const inputs = {
		token      : core.getInput('repo-token', { required: true }),
		pivotalKey : core.getInput('pivotal-api-key'),
	};

	const pr = github.context.payload.pull_request;

	if (!pr) {
		core.setFailed('This action must be run with only "pull_request".');
		return;
	}

	const event = github.context.eventName;
	const action = github.context.payload.action;

	console.log(event);
	console.log(action);

	if (event === 'pull_request' && action === 'opened') {
		await noTicketCheck(github.context, inputs);

	} else if (event === 'pull_request' && action === 'closed') {
		await updateTicketState(github.context, inputs);

	}

}

// Call the main function.
main();
