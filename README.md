## Spring Health Actions
These are the actions that we use at Spring Health for automating different aspects of our workflow. They are ever growing.

1. [Spring Health Pull Request Labeler](src/pull_request_labeler/README.md) labels PRs on GitHub.
1. [Spring Health Changes Requested Helper](src/changes_requested/README.md) handles when a change is requested on a PR. It can even send slack messages!


# Updating
To update, make sure that you run the build command before pushing.  The `dist` directory is included on purpose.  Github runs the contents of those files directly when running the actions.
