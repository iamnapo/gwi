const fs = require("fs");
const path = require("path");

const chalk = require("chalk");
const del = require("del");
const ora = require("ora");
const replace = require("replace-in-file");
const execa = require("execa");

const tasks = require("./tasks");

const filterAllBut = (keep, from) => keep.reduce((acc, moduleName) => ({ ...acc, [moduleName]: from[moduleName] }), {});

module.exports = async (
	{
		description,
		email,
		fullName,
		githubUsername,
		install,
		projectName,
		repoInfo,
		runner,
		ci,
		workingDirectory,
		eslint,
	},
	taskss,
) => {
	let masterIsHere = false;
	if (githubUsername === "iamnapo") {
		console.log(chalk.redBright.dim("  🔱  Welcome back, master."));
		masterIsHere = true;
	}
	const clonePackage = ora("Cloning default repository.").start();
	const { commitHash, gitHistoryDir } = await taskss.cloneRepo(repoInfo, workingDirectory, projectName);
	await del([gitHistoryDir]);
	clonePackage.succeed(`Cloning default repository. ${chalk.dim(`Cloned at commit: ${commitHash}`)}`);

	const spinnerPackage = ora("Updating package.json").start();
	const projectPath = path.join(workingDirectory, projectName);
	const pkgPath = path.join(projectPath, "package.json");
	const keptDevDeps = ["ava", "nyc", "husky"];
	if (eslint) {
		keptDevDeps.push("eslint", "eslint-config-airbnb", "eslint-config-iamnapo", "eslint-plugin-import",
			"eslint-plugin-jsx-a11y", "eslint-plugin-react", "eslint-plugin-react-hooks", "eslint-plugin-unicorn");
	}
	const keptDeps = [];
	const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
	const newPkg = {
		...pkg,
		name: projectName,
		version: "0.1.0",
		description,
		scripts: {
			...(eslint ? { lint: "eslint ." } : {}),
			start: "node ./bin/gwi.js",
			test: eslint ? `${runner === "npm" ? "npm run" : "yarn"} lint && nyc ava` : "nyc ava",
		},
		husky: { hooks: { "pre-commit": `${runner} test` } },
		repository: `github:${githubUsername}/${projectName}`,
		author: {
			...pkg.author,
			name: masterIsHere ? "Napoleon-Christos Oikonomou" : fullName,
			email,
			url: masterIsHere ? "https://iamnapo.me" : `https://github.com/${githubUsername}`,
		},
		dependencies: filterAllBut(keptDeps, pkg.dependencies),
		devDependencies: filterAllBut(keptDevDeps, pkg.devDependencies),
		keywords: [],
		files: ["src", `${projectName}.js`],
	};
	delete newPkg.bin;

	fs.writeFileSync(pkgPath, `${JSON.stringify(newPkg, null, 2)}\n`);
	await replace({
		files: path.join(projectPath, "package.json"),
		from: [/\.\/bin\/gwi/g, /gwi/g, /(?<=[^-])iamnapo/g],
		to: [projectName, projectName, githubUsername],
	});
	spinnerPackage.succeed();

	const spinnerLicense = ora("Updating LICENSE").start();
	await replace({
		files: path.join(projectPath, "LICENSE"),
		from: ["Napoleon-Christos Oikonomou", "napoleonoikon@gmail.com", "iamnapo.me"],
		to: [
			masterIsHere ? "Napoleon-Christos Oikonomou" : fullName,
			email,
			masterIsHere ? "https://iamnapo.me" : `https://github.com/${githubUsername}`,
		],
	});
	spinnerLicense.succeed();

	const spinnerReadme = ora("Updating README.md").start();
	await replace({ files: path.join(projectPath, "README.md"), from: /\[!\[n.*gwi\) /g, to: "" });
	await replace({ files: path.join(projectPath, "README.md"), from: [/gwi/g, /iamnapo/g], to: [projectName, githubUsername] });
	await replace({
		files: path.join(projectPath, "README.md"),
		from: ["Interactive CLI for creating new JS repositories", "![Usage](usage.gif)", "-g "],
		to: [description, `\`\`\`sh\n$ ${projectName}\n\`\`\``, ""],
	});
	if (!ci) {
		await replace({ files: path.join(projectPath, "README.md"), from: /\[!\[b.*actions\) /g, to: "" });
	}
	spinnerReadme.succeed();

	if (ci) {
		const spinnerCI = ora("Updating CI .yml").start();
		await replace({
			files: path.join(projectPath, ".github", "workflows", "ci.yml"),
			from: [/yarn\n/g, /yarn(?<! )/g, /(?<=(true\n))(.|\n)*/g],
			to: [`${runner === "npm" ? "npm i" : "yarn"}\n`, runner, ""],
		});
		spinnerCI.succeed();
	}

	const spinnerDelete = ora("Deleting unnecessary files").start();
	await del([
		`${path.join(projectPath, "src")}/*`,
		`${path.join(projectPath, "tests")}/*`,
		`${path.join(projectPath, "bin")}`,
		`${path.join(projectPath, ".npmignore")}`,
		`${path.join(projectPath, "usage.gif")}`,
		`${path.join(projectPath, "yarn.lock")}`,
		`${path.join(projectPath, ".github", "workflows", "publish.yml")}`,
	]);
	if (!ci) del([path.join(projectPath, ".github")]);
	fs.renameSync(path.join(projectPath, "index.js"), path.join(projectPath, `${projectName}.js`));
	fs.writeFileSync(path.join(projectPath, "tests", "unit.test.js"), "const test = require(\"ava\");\n\ntest.todo(\"main\");\n");
	spinnerDelete.succeed();

	if (install) {
		const installDeps = ora("Installing dependencies").start();
		await taskss.install(runner, projectPath);
		installDeps.succeed();
	}

	const gitIsConfigured = Boolean(fullName !== tasks.PLACEHOLDERS.NAME && email !== tasks.PLACEHOLDERS.EMAIL);
	if (gitIsConfigured) {
		const spinnerGitInit = ora("Initializing git").start();
		if (masterIsHere) {
			await execa("git", ["init"], { cwd: projectPath, encoding: "utf8", stdio: "pipe" });
		} else {
			await taskss.initialCommit(commitHash, projectPath, fullName);
		}
		spinnerGitInit.succeed();
	}

	console.log(`\n${chalk.blue.bold(`Created ${projectName}. 🎉`)}\n`);
};
