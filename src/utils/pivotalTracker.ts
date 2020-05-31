const github = require('@actions/github');

import axios from 'axios';
import { addLabels } from '../utils/labeler';

export async function setState(storyId: string, pivotalKey: string): Promise<void> {

	const baseUrl = 'https://www.pivotaltracker.com/services/v5';

	const headers = {
		headers: {
			'Content-Type'   : 'application/json',
			'X-TrackerToken' : pivotalKey,
		},
	};

	try {

		const storyUrl = `${baseUrl}/stories/${storyId}`;
		// Fetch project_id of a specific story
		const story = await axios.get(storyUrl, headers);

		const webhookUrl = `${baseUrl}/projects/${story.data.project_id}/stories/${storyId}`;
		// Determine story_type (chore, bug, feature)
		const response = await axios.get(webhookUrl, headers);

		const newState = response.data.story_type === 'chore' ? 'accepted' : 'finished';
		// Update state of ticket
		await axios.put(
			webhookUrl,
			{ current_state: newState },
			headers
		);

	} catch(error) {
		console.log('ERROR: ', error);
	}
}

export async function noTicketCheck(context, inputs): Promise<void> {

	try {
		const pr = context.payload.pull_request;
		const text = pr.body;
		const pullNumber = pr.number;
		const token = inputs.token;
		const client = new github.GitHub(token);

		const regex = /((http|https):\/\/www.pivotaltracker.com\/story\/show\/[1-9]\d{6,})/g;
		const parsedUrls = text.match(regex) || [];

		if (!parsedUrls || parsedUrls.length === 0) {
			// Adds label when PT url is not found in the PR description.
			if (!parsedUrls || parsedUrls.length === 0) {
				addLabels(
					client,
					pullNumber,
					['no-ticket']
				);
			}
		}
	} catch(error) {
		console.log(error);
	}
}