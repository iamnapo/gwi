const meow = require('meow');
const nock = require('nock');
const checkArgs = require('../src/args');
const tasks = require('../src/tasks');
const utils = require('../src/utils');

const pretendLatestVersionIs = (version) => {
	nock.disableNetConnect();
	nock('https://registry.npmjs.org:443').get('/gwi').reply(200, {
		'dist-tags': { latest: version },
		name: 'gwi',
		versions: {
			[version]: {
				version,
			},
		},
	});
};

test("doesn't error if not outdated", async () => {
	const currentVersion = meow('').pkg.version;
	expect(typeof currentVersion === 'string').toBeTruthy();
	pretendLatestVersionIs(currentVersion);
	expect(checkArgs).not.toThrow();
});

test("doesn't error if update-notifier fails", async () => {
	expect.assertions(1);
	nock.disableNetConnect();
	nock('https://registry.npmjs.org:443').get('/gwi').reply(404, {});
	expect(checkArgs).not.toThrow();
});

test('checkArgs returns the right options', async () => {
	pretendLatestVersionIs('1.0.0');
	process.argv = [
		'path/to/node',
		'path/to/gwi',
		'example-project',
		'-description "example description"',
		'--travis',
		'--yarn',
		'--no-eslint',
		'--no-install',
	];
	const opts = await checkArgs();
	const currentVersion = meow('').pkg.version;
	expect(opts).toEqual({
		description: '',
		install: false,
		projectName: 'example-project',
		runner: utils.RUNNER.YARN,
		starterVersion: currentVersion,
		travis: true,
		eslint: false,
	});
});

test('checkArgs always returns a GwiRequiredConfig, even in interactive mode', async () => {
	pretendLatestVersionIs('1.0.0');
	process.argv = ['path/to/node', 'path/to/gwi'];
	const opts = await checkArgs();
	expect(typeof opts.install).toBe('boolean');
	expect(typeof opts.starterVersion).toBe('string');
});

test('only accepts valid package names', async () => {
	expect(utils.validateName('package-name')).toBe(true);
	expect(utils.validateName('package-name-2')).toBe(true);
	expect(utils.validateName('@example/package-name-2')).toBe(true);
});

const mockErr = code =>
	() => {
		const err = new Error();
		err.code = code;
		throw err;
	};

test('tasks.cloneRepo: errors when Git is not installed on PATH', async () => {
	expect.assertions(1);
	try {
		await tasks.cloneRepo(mockErr('ENOENT'))({ repo: 'r', branch: 'b' }, 'd', 'p');
	} catch (e) {
		expect(e.message).toContain('Git is not installed on your PATH');
	}
});

test('tasks.cloneRepo: throws when clone fails', async () => {
	expect.assertions(1);
	try {
		await tasks.cloneRepo(mockErr(128))({ repo: 'r', branch: 'b' }, 'd', 'p');
	} catch (e) {
		expect(e.message).toContain('Git clone failed.');
	}
});

test('tasks.cloneRepo: throws when rev-parse fails', async () => {
	let calls = 0;
	const mock = async () => {
		calls += 1;
		return calls === 1 ? {} : mockErr(128)();
	};
	expect.assertions(1);
	try {
		await tasks.cloneRepo(mock)({ repo: 'r', branch: 'b' }, 'd', 'p');
	} catch (e) {
		expect(e.message).toContain('Git rev-parse failed.');
	}
});

test('tasks.getGithubUsername: returns found users', async () => {
	const mockFetcher = async email => email.split('@')[0];
	const username = await tasks.getGithubUsername(mockFetcher)('iamnapo@github.com');
	expect(username).toBe('iamnapo');
});

test("tasks.getGithubUsername: returns placeholder if user doesn't have Git user.email set", async () => {
	const mockFetcher = async () => {};
	const username = await tasks.getGithubUsername(mockFetcher)(tasks.PLACEHOLDERS.EMAIL);
	expect(username).toBe(tasks.PLACEHOLDERS.USERNAME);
});

test('tasks.getGithubUsername: returns placeholder if not found', async () => {
	const mockFetcher = async () => {
		throw new Error();
	};
	const username = await tasks.getGithubUsername(mockFetcher)('iamnapo@github.com');
	expect(username).toBe(tasks.PLACEHOLDERS.USERNAME);
});

test('tasks.getUserInfo: suppresses errors and returns empty strings', async () => {
	const result = await tasks.getUserInfo(mockErr(1))();
	expect(result).toEqual({
		gitEmail: tasks.PLACEHOLDERS.EMAIL,
		gitName: tasks.PLACEHOLDERS.NAME,
	});
});

test('tasks.getUserInfo: returns results properly', async () => {
	const mock = async () => ({
		stdout: 'result',
	});
	const result = await tasks.getUserInfo(mock)();
	expect(result).toEqual({
		gitEmail: 'result',
		gitName: 'result',
	});
});

test('tasks.initialCommit: throws generated errors', async () => {
	expect.assertions(1);
	try {
		await tasks.initialCommit(mockErr(1))('deadbeef', 'fail');
	} catch (e) {
		expect(e.code).toBe(1);
	}
});

test('tasks.initialCommit: spawns 3 times', async () => {
	expect.assertions(4);
	const mock = async () => {
		expect(1).toBe(1);
	};
	expect(() => tasks.initialCommit(mock)('commit', 'dir')).not.toThrow();
});

test('tasks.install: uses the correct runner', async () => {
	const mock = async runner => expect(runner).toBe(utils.RUNNER.YARN);
	await tasks.install(mock)(utils.RUNNER.YARN, 'pass');
});

test('tasks.install: throws pretty error on failure', async () => {
	try {
		await tasks.install(mockErr())(utils.RUNNER.NPM, 'fail');
	} catch (e) {
		expect(e.message).toContain('Installation failed. You\'ll need to install manually.');
	}
});

test("tasks.getRepoInfo: returns defaults when GWI_REPO_URL/BRANCH aren't set", async () => {
	const thisRelease = '9000.0.1';
	expect(tasks.getRepoInfo(thisRelease)).toEqual({
		branch: `v${thisRelease}`,
		repo: 'https://github.com/iamnapo/gwi.git',
	});
	const url = 'https://another/repo';
	process.env.GWI_REPO_URL = url;
	expect(tasks.getRepoInfo(thisRelease)).toEqual({
		branch: 'master',
		repo: url,
	});
	const branch = 'test';
	process.env.GWI_REPO_BRANCH = branch;
	expect(tasks.getRepoInfo(thisRelease)).toEqual({
		branch,
		repo: url,
	});
});
