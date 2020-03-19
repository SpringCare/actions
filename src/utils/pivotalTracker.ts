import axios from 'axios';

export async function pivotalTracker(webhookUrl: string, pivotalKey: string): Promise<void> {

	try {
		// Determine story_type (chore, bug, feature)
		const story = await axios.get(webhookUrl, {
			headers: {
				'Content-Type'   : 'application/json',
				'X-TrackerToken' : pivotalKey,
			},
		});

		const newState = story.data.story_type === 'chore' ? 'accepted' : 'finished';
		// Update state of ticket
		await axios.put(webhookUrl, {current_state: newState}, {
			headers: {
				'Content-Type'   : 'application/json',
				'X-TrackerToken' : pivotalKey,
			},
		});

	} catch(error) {
		console.log('ERROR: ', error);
	}
}