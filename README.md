# Abandoned Branch - Use "main" Instead
This branch has been abandoned in favor of the "main" branch.  This branch only exists to prevent breaking existing actions consumers that are pointing to master.

# Spring Health Actions
These are the actions that we use at Spring Health for automating different aspects of our workflow. They are ever growing.

1. [Spring Health Changes in Branch Labeler](src/changes_in_branch_labeler) adds a label mentioning whether or not commits in a PR are already present in a target branch.
1. [Spring Health Changes Requested Helper](src/changes_requested/README.md) handles when a change is requested on a PR. It can even send slack messages!
1. [Spring Health Pull Request Labeler](src/pull_request_labeler/README.md) labels PRs on GitHub.
1. [Spring Health Pull Request Metrics](src/pull_request_metrics/README.md) collects metrics on the PRs in your organization when the PR is closed.


# Updating
To update, make sure that you run the build command before pushing.  The `dist` directory is included on purpose.  Github runs the contents of those files directly when running the actions.
