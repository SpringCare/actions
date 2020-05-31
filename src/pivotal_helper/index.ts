const core = require('@actions/core');
const github = require('@actions/github');

import { updateTicketState } from './updateTicketState';

async function main(): Promise<void> {

	const pivotalKey = core.getInput('pivotal-api-key');
	const pr = github.context.payload.pull_request;

	if (!pr) {
		core.setFailed('This action must be run with only "pull_request".');
		return;
	}

	await updateTicketState(github.context, pivotalKey);
}

// Call the main function.
main();
