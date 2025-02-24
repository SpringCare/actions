const github = require('@actions/github');

export async function getReviews(token: string, pullNumber: string): Promise<{data: []}> {

  console.log('Getting reviews for PR', pullNumber);
	const client = new github.GitHub(token);

  try {
    return await client.pulls.listReviews({
      owner       : github.context.repo.owner,
      repo        : github.context.repo.repo,
      pull_number : pullNumber,
    });
  } catch (error) {
    console.error('Error getting reviews');
    console.error(error);
    return { data: [] };
  }
}
