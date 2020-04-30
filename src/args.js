const meow = require("meow");
const updateNotifier = require("update-notifier");
const utils = require("./utils");

module.exports = async () => {
	const cli = meow(
		`
	Usage
		$ gwi

	Non-Interactive Usage
		$ gwi <project-name> [options]

	Options
		--description, -d   package.json description
		--yarn              use yarn (default: npm)

		--no-ci             don't include CI configuration
		--no-install        skip yarn/npm install
		--no-eslint         don't include eslint

	Non-Interactive Example
		$ gwi my-library -d 'do something, better'
		`,
		{
			flags: {
				description: { alias: "d", default: "a js project", type: "string" },
				ci: { default: true, type: "boolean" },
				yarn: { default: false, type: "boolean" },
				install: { default: true, type: "boolean" },
				eslint: { default: true, type: "boolean" },
			},
		},
	);

	// Immediately check for updates every time we run gwi
	const notifier = new updateNotifier.UpdateNotifier({ pkg: cli.pkg, updateCheckInterval: 0 });
	notifier.check();
	notifier.notify();

	const [input] = cli.input;
	if (!input) {
		// No project-name provided, return to collect options in interactive mode
		return {
			ci: cli.flags.ci,
			install: cli.flags.install,
			eslint: cli.flags.eslint,
			starterVersion: cli.pkg.version,
		};
	}
	const validOrMsg = await utils.validateName(input);
	if (typeof validOrMsg === "string") throw new TypeError(validOrMsg);

	return {
		description: cli.flags.description,
		install: cli.flags.install,
		eslint: cli.flags.eslint,
		projectName: input,
		runner: cli.flags.npm ? "npm" : "yarn",
		starterVersion: cli.pkg.version,
		ci: cli.flags.ci,
	};
};
