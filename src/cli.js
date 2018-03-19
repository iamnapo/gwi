const chalk = require('chalk');
const checkArgs = require('./args');
const inquire = require('./inquire');
const tasks = require('./tasks');
const gwi = require('./gwi');
const utils = require('./utils');

(async () => {
	const argInfo = await checkArgs();
	const userOptions = utils.hasCLIOptions(argInfo) ? argInfo : {
		...argInfo,
		...(await (async () => {
			console.log(utils.getIntro());
			return inquire();
		})()),
	};
	const options = await tasks.addInferredOptions(userOptions);
	return gwi(options, tasks.LiveTasks);
})().catch((err) => {
	console.error(`${chalk.red(err.message)}`);
	process.exit(1);
});
