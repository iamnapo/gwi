const meow = require('meow');
const updateNotifier = require('update-notifier');
const utils = require('./utils');

module.exports = async () => {
	const cli = meow(
		`
	Usage
		$ gwi

	Non-Interactive Usage
		$ gwi <project-name> [options]

	Options
		--description, -d   package.json description
		--travis , -ci      include Travis CI configuration
		--npm               use npm (default: yarn)

		--no-install        skip yarn/npm install
		--no-xo             don't include xo

		Non-Interactive Example
		$ gwi my-library -d 'do something, better'
		`,
		{
			flags: {
				description: {
					alias: 'd',
					default: 'a js project',
					type: 'string'
				},
				travis: {
					alias: 'ci',
					default: false,
					type: 'boolean'
				},
				yarn: {
					default: true,
					type: 'boolean'
				},
				install: {
					default: true,
					type: 'boolean'
				},
				xo: {
					default: true,
					type: 'boolean'
				}
			}
		},
	);

	// Immediately check for updates every time we run gwi
	const notifier = new updateNotifier.UpdateNotifier({
		pkg: cli.pkg,
		updateCheckInterval: 0
	});
	notifier.check();
	notifier.notify();

	const [input] = cli.input;
	if (!input) {
		// No project-name provided, return to collect options in interactive mode
		// note: we always return `install` and `xo`, so --no-install and --no-xo always work
		// (important for test performance)
		return {
			travis: cli.flags.travis,
			install: cli.flags.install,
			xo: cli.flags.xo,
			starterVersion: cli.pkg.version
		};
	}
	const validOrMsg = await utils.validateName(input);
	if (typeof validOrMsg === 'string') {
		throw new TypeError(validOrMsg);
	}

	return {
		description: cli.flags.description,
		install: cli.flags.install,
		xo: cli.flags.xo,
		projectName: input,
		runner: cli.flags.npm ? utils.RUNNER.NPM : utils.RUNNER.YARN,
		starterVersion: cli.pkg.version,
		travis: cli.flags.travis
	};
};
