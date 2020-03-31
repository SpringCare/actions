import axios from 'axios';

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
