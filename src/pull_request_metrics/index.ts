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
		token  		      : core.getInput('repo-token', { required: true }),
		firebaseSecret : core.getInput('firebase-secret'),
		firebaseURL  		: core.getInput('firebase-url'),
	};

	console.log('payload', github.context.payload);

	const pr = github.context.payload.pull_request;
	const repo = github.context.payload.repository.full_name;

	console.log('PR', pr);
	console.log('Repo', repo);

	if (!pr) {
		core.setFailed('This action must be run with only "pull_request"');
		return;
	}

	if (!pr.closed_at) {
		return;
	}

	const pullNumber = pr.number;

	console.log('Getting reviews for PR', pullNumber);
	const { data } = await getReviews(inputs.token, pullNumber);

	console.log('Parsing reviews');
	const activeReviews = parseReviews(data || []);
	console.log('Finding approved reviews');
	const approvedReviews = activeReviews.filter((r) => r.state.toLowerCase() === 'approved');

	console.log('Getting PR metadata');
	const author = pr.user;
	const { state, body, created_at, merged_at, closed_at } = pr;

	console.log('PR number is', pullNumber);
	console.log('Inputs', inputs);

	try {
		console.log('Updating Firebase');
		const res = await axios.put(`${inputs.firebaseURL}/github/pull-request-closed/${repo}/${pullNumber}.json?auth=${inputs.firebaseSecret}`, {
			author: {
				id 	 : author.id,
				name : author.login,
			},
			body,
			state,
			created_at,
			merged_at,
			closed_at,
			approvers 	   : approvedReviews.length,
			total_reviews : activeReviews.length,
		});
		console.log('Response', res.data);
	} catch (error) {
		console.error('Error', error);
		throw error;
	}
}

// Call the main function.
main();
