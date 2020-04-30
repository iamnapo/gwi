const path = require("path");
const execa = require("execa");
const githubUsername = require("github-username");

const inherit = "inherit";

const PLACEHOLDERS = {
	EMAIL: "YOUR_EMAIL",
	NAME: "YOUR_NAME",
	USERNAME: "YOUR_GITHUB_USER_NAME",
};

const cloneRepo = (spawner, suppressOutput = true) => async (repoInfo, workingDirectory, dir) => {
	const projectDir = path.join(workingDirectory, dir);
	const gitHistoryDir = path.join(projectDir, ".git");
	try {
		await spawner(
			"git",
			["clone", "--depth=1", `--branch=${repoInfo.branch}`, repoInfo.repo, dir],
			{ cwd: workingDirectory, stdio: suppressOutput ? "pipe" : "inherit" },
		);
	} catch (error) {
		if (error.code === "ENOENT") {
			throw new Error(`
    Git is not installed on your PATH. Please install Git and try again.

    For more information, visit: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
    `);
		} else {
			try {
				await spawner(
					"git",
					["clone", "--depth=1", "--branch=master", repoInfo.repo, dir],
					{ cwd: workingDirectory, stdio: suppressOutput ? "pipe" : "inherit" },
				);
			} catch (_) {
				throw new Error("Git clone failed.");
			}
		}
	}
	try {
		const revParseResult = await spawner("git", ["rev-parse", "HEAD"], {
			cwd: projectDir,
			encoding: "utf8",
			stdio: ["pipe", "pipe", inherit],
		});
		const commitHash = revParseResult.stdout;
		return { commitHash, gitHistoryDir };
	} catch (error) {
		throw new Error("Git rev-parse failed.");
	}
};

const getGithubUsername = (fetcher) => async (email) => {
	if (email === PLACEHOLDERS.EMAIL) return PLACEHOLDERS.USERNAME;
	return fetcher(email).catch(() => PLACEHOLDERS.USERNAME);
};

const getUserInfo = (spawner) => async () => {
	const opts = { encoding: "utf8", stdio: ["pipe", "pipe", inherit] };
	try {
		const nameResult = await spawner("git", ["config", "user.name"], opts);
		const emailResult = await spawner("git", ["config", "user.email"], opts);
		return { gitEmail: emailResult.stdout, gitName: nameResult.stdout };
	} catch (error) {
		return { gitEmail: PLACEHOLDERS.EMAIL, gitName: PLACEHOLDERS.NAME };
	}
};

const initialCommit = (spawner) => async (hash, projectDir) => {
	const opts = { cwd: projectDir, encoding: "utf8", stdio: "pipe" };
	await spawner("git", ["init"], opts);
	await spawner("git", ["add", "-A"], opts);
	await spawner("git", ["commit", "-m", "Initial commit\n\nCreated with iamnapo/gwi"], opts);
};

const install = (spawner) => async (runner, projectDir) => {
	const opts = { cwd: projectDir, encoding: "utf8", stdio: "pipe" };
	try {
		return runner === "npm" ? await spawner("npm", ["install"], opts) : await spawner("yarn", opts);
	} catch (error) {
		throw new Error("Installation failed. You'll need to install manually.");
	}
};

const getRepoInfo = (starterVersion) => (process.env.GWI_REPO_URL
	? { branch: process.env.GWI_REPO_BRANCH ? process.env.GWI_REPO_BRANCH : "master", repo: process.env.GWI_REPO_URL }
	: { branch: `v${starterVersion}`, repo: "https://github.com/iamnapo/gwi.git" }
);

const LiveTasks = {
	cloneRepo: cloneRepo(execa),
	initialCommit: initialCommit(execa),
	install: install(execa),
};

const addInferredOptions = async (userOptions) => {
	const { gitName, gitEmail } = await getUserInfo(execa)();
	const username = await getGithubUsername(githubUsername)(gitEmail);
	const inferredOptions = {
		email: gitEmail,
		fullName: gitName,
		githubUsername: username,
		repoInfo: getRepoInfo(userOptions.starterVersion),
		workingDirectory: process.cwd(),
	};
	return {
		...inferredOptions,
		description: userOptions.description,
		install: userOptions.install,
		projectName: userOptions.projectName,
		runner: userOptions.runner,
		eslint: userOptions.eslint,
		ci: userOptions.ci,
	};
};

module.exports = {
	inherit,
	PLACEHOLDERS,
	cloneRepo,
	getGithubUsername,
	getUserInfo,
	initialCommit,
	install,
	getRepoInfo,
	LiveTasks,
	addInferredOptions,
};
