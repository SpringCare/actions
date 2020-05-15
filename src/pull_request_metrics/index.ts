const core = require('@actions/core');
const github = require('@actions/github');

import axios from 'axios';

import { parseReviews } from '../utils/parseReviews';
import { getReviews } from '../utils/getReviews';

async function main(): Promise<void> {
	// Get a few inputs from the GitHub event.
	const inputs: {
		token: string;
		firebaseSecret: string;
		firebaseURL: string;
	} = {
		token          : core.getInput('repo-token', { required: true }),
		firebaseSecret : core.getInput('firebase-secret'),
		firebaseURL    : core.getInput('firebase-url'),
	};

	console.log('payload', github.context.payload);

	const pr = github.context.payload.pull_request;
	const repo = github.context.payload.repository.full_name;

	if (!pr) {
		core.setFailed('This action must be run with only "pull_request"');
		return;
	}

	if (!pr.closed_at) {
		return;
	}

	const pullNumber = pr.number;

	const { data } = await getReviews(inputs.token, pullNumber);

	const activeReviews = parseReviews(data || []);
	const approvedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'approved');

	const author = pr.user;
	const { state, body, opened_at, merged_at, closed_at } = pr;

	console.log('PR number is', pullNumber);
	console.log('Inputs', inputs);

	axios.put(`${inputs.firebaseURL}/github/pull-request-closed/${repo}/${pullNumber}.json?auth=${inputs.firebaseSecret}`, {
		author: {
			id   : author.id,
			name : author.login,
		},
		body,
		state,
		opened_at,
		merged_at,
		closed_at,
		approvers     : approvedReviews.length,
		total_reviews : activeReviews.length,
	});
}

// Call the main function.
main();
