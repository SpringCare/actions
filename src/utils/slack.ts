import axios from 'axios';

export function sendMessage(
	webhookUrl: string,
	channel: string,
	message: string,
	username: string = "Spring Health",
	iconEmoji?: string,
	) {

	axios.post(webhookUrl, {
		channel,
		username,
		icon_emoji: iconEmoji,
		text: message,
	});
}