import axios from 'axios';

export async function setState(webhookUrl: string, pivotalKey: string): Promise<void> {

	const headers = {
		headers: {
			'Content-Type'   : 'application/json',
			'X-TrackerToken' : pivotalKey,
		},
	};

	try {
		// Determine story_type (chore, bug, feature)
		const story = await axios.get(webhookUrl, headers);

		const newState = story.data.story_type === 'chore' ? 'accepted' : 'finished';
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

export async function getProjectId(webhookUrl: string, pivotalKey: string): Promise<number> {

	try {
		const story = await axios.get(webhookUrl, {
			headers: {
				'Content-Type'   : 'application/json',
				'X-TrackerToken' : pivotalKey,
			},
		});

		return story.data.project_id;

	} catch(error) {
		console.log('ERROR: ', error);
	}

}