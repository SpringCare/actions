import axios from 'axios';

export function sendMessage(
	webhookUrl: string,
	channel: string,
	message: string,
	username = 'Spring Health',
	iconEmoji?: string,
): void {

	axios.post(webhookUrl, {
		channel,
		username,
		icon_emoji: iconEmoji,
		text: message,
	});
}