const github = require('@actions/github');

import { addLabels } from '../utils/labeler';

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