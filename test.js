var stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding();

stdin.on('data', function(key) {
	if (key === '\u0003' || key === '\u0004') {
		process.exit();
	}

	process.stdout.write(JSON.stringify(key) + '\n');
});
