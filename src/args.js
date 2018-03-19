const meow = require('meow');
const updateNotifier = require('update-notifier');
const utils = require('./utils');

module.exports = async function checkArgs() {
	const cli = meow(
		`
	Usage
		$ npx gwi

	Non-Interactive Usage
		$ npx gwi <project-name> [options]
	
	Options
		--description, -d   package.json description
		--travis , -ci      include Travis CI configuration
		--yarn              use yarn (default: npm)

		--no-install        skip yarn/npm install
		--no-eslint         don't include eslint

		Non-Interactive Example
		$ npx gwi my-library -d 'do something, better'
		`,
		{
			flags: {
				description: {
					alias: 'd',
					default: 'a js project',
					type: 'string',
				},
				travis: {
					alias: 'ci',
					default: false,
					type: 'boolean',
				},
				yarn: {
					default: false,
					type: 'boolean',
				},
				install: {
					default: true,
					type: 'boolean',
				},
				eslint: {
					default: true,
					type: 'boolean',
				},
			},
		},
	);

	// immediately check for updates every time we run gwi
	const notifier = new updateNotifier.UpdateNotifier({
		pkg: cli.pkg,
		updateCheckInterval: 0,
	});
	notifier.check();
	notifier.notify();

	const input = cli.input[0];
	if (!input) {
		// no project-name provided, return to collect options in interactive mode
		// note: we always return `install` and `eslint`, so --no-install and --no-eslint always work
		// (important for test performance)
		return {
			travis: cli.flags.travis,
			install: cli.flags.install,
			eslint: cli.flags.eslint,
			starterVersion: cli.pkg.version,
		};
	}
	const validOrMsg = await utils.validateName(input);
	if (typeof validOrMsg === 'string') throw new Error(validOrMsg);

	return {
		description: cli.flags.description,
		install: cli.flags.install,
		eslint: cli.flags.eslint,
		projectName: input,
		runner: cli.flags.yarn ? utils.RUNNER.YARN : utils.RUNNER.NPM,
		starterVersion: cli.pkg.version,
		travis: cli.flags.travis,
	};
};
