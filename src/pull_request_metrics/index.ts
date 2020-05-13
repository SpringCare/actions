const core = require('@actions/core');
const github = require('@actions/github');

import * as firebase from 'firebase/app';
import 'firebase/firestore';

import { parseReviews } from '../utils/parseReviews';
import { getReviews } from '../utils/getReviews';

type FirebaseConfig = {
	apiKey: string;
	authDomain: string;
	databaseURL: string;
	projectId: string;
	storageBucket: string;
	messagingSenderId?: string;
	appId: string;
};

async function main(): Promise<void> {
	// Get a few inputs from the GitHub event.
	const inputs: {
		token: string;
		firebaseConfig: FirebaseConfig;
	} = {
		token          : core.getInput('repo-token', { required: true }),
		firebaseConfig : core.getInput('firebase-config'),
	};

	firebase.initializeApp(inputs.firebaseConfig);
	const db = firebase.firestore();

	const pr = github.context.payload.pull_request;
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
	const repo = pr.repo.full_name;

	console.log('PR number is', pullNumber);
	console.log('Inputs', inputs);

	db.collection(repo).add({
		id     : pullNumber,
		author : {
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
