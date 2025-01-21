# Contributing to @uu-cdh/backbone-collection-transformers

## Required software

- [Node.js](https://nodejs.org/)
- [npm](https://npmjs.com/)
- [git](https://git-scm.com/)

## First time after cloning the repository

```bash
npm install
```

## Code organization

All source code is in [ES module format][esm] in the `src/` directory.

Please be mindful of users who need backwards compatibility. Do not use new language features such as spread syntax or `async`/`await` unless you really need to. Transpiled code can be bulky and polyfills tend to be huge.

[esm]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

## Whitespace formatting

Please see the [.editorconfig](.editorconfig) on how to format whitespace. Installing the appropriate [editorconfig plugin][editorconfig] for your favorite editor is the easiest way to ensure that you respect the conventions.

[editorconfig]: https://editorconfig.org/

## Running tests

`npm run test`, then open http://localhost:9876/ in a browser. Test output goes to the terminal. As long as the browser tab stays in the foreground, tests will automatically rerun when you edit the code.

Press the DEBUG button in the browser in order to get a version of the page where you can inspect the code and set breakpoints.

If you edit the `karma.conf.js` or the `package.json`, you need to stop and restart the process in order for changes to take effect.

## Branching model

[Gitflow](https://nvie.com/posts/a-successful-git-branching-model/). `main` is the branch with only releases, `develop` is our integration branch where all pull requests go. Versions are tagged with a `v` prefix, for example `v1.2.3`.

## Versioning scheme

[Semver](https://semver.org/).

## How to cut a release

1. Create a release branch and have it reviewed.
2. Double-check that you bumped the version number and that all tests pass.
3. Double-check that changes are documented.
4. Run `npm publish`.
5. Run `git flow release finish` if you can and skip to step 8. Otherwise continue with the next step.
6. Merge the release branch both in `main` and in `develop`.
7. Tag the merge commit on `main` with the version number.
8. Push `main`, `develop` and the new tag to the upstream repository.
9. Generate release notes for the new tag on GitHub.
