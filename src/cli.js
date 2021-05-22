#!/usr/bin/env node

import chalk from "chalk";

import checkArgs from "./args.js";
import inquire from "./inquire.js";
import gwi from "./gwi.js";
import { getIntro } from "./utils.js";
import { addInferredOptions, LiveTasks } from "./tasks.js";

(async () => {
	try {
		const argInfo = await checkArgs();
		const userOptions = argInfo.projectName ? argInfo : {
			...argInfo,
			...(await (() => {
				console.log(getIntro(process.stdout.columns));
				return inquire();
			})()),
		};
		const options = await addInferredOptions(userOptions);
		return gwi(options, LiveTasks);
	} catch (error) {
		console.error(`${chalk.red(error.message)}`);
		return process.exit(1);
	}
})();
