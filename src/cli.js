#!/usr/bin/env node

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
    ...(await (() => {
      console.log(utils.getIntro(process.stdout.columns));
      return inquire();
    })()),
  };
  const options = await tasks.addInferredOptions(userOptions);
  return gwi(options, tasks.LiveTasks);
})().catch((error) => {
  console.error(`${chalk.red(error.message)}`);
  process.exit(1);
});
