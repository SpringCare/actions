import axios from 'axios';

export function sendMessage(
	webhookUrl: string,
	channel: string,
	message: string,
	username: string = "Spring Health",
	icon_emoji?: string,
	) {

	axios.post(webhookUrl, {
		channel,
		username,
		icon_emoji,
		text: message,
	});
}