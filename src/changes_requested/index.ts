const github = require('@actions/github');
const core = require('@actions/core');

const verifyConfig = require('../utils/verifyConfig');
import { pullRequestSubmitted } from './pullRequestSubmitted.js';
import { pullRequestUnlabeled } from './pullRequestUnlabeled.js';


// Call the main function.
main();

async function main(): Promise<{}> {
	// Grab the config variables. Abort if they're unavailable.
	const config = verifyConfig();

	// Get a few inputs from the GitHub event.
	const inputs = {
		token: core.getInput('repo-token', { required: true }),
		labelChangesRequested: core.getInput('label-on-changes-requested'),
		alertOnRemoved: core.getInput('alert-on-label-removed'),
		slackUrl: core.getInput('slack-webhook-url'),
		slackChannel: core.getInput('slack-channel'),
		botName: core.getInput('bot-name'),
		iconEmoji: core.getInput('icon_emoji'),
		githubSlackMapping: core.getInput('github-slack-mapping'),
	};

	const pr = github.context.payload.pull_request;

	if (!pr) {
		core.setFailed('This action must be run with only "pull_request_review".');
		return;
	}

	const event = github.context.eventName;
	const action = github.context.payload.action;
	
	console.log(event);
	console.log(action);

	if (event === 'pull_request_review' && action === 'submitted') {
		await pullRequestSubmitted(github.context, inputs);

	} else if (event === 'pull_request' && action === 'unlabeled') {
		await pullRequestUnlabeled(github.context, inputs);
	}
}

