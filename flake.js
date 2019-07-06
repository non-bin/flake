#!/usr/bin/node

// controll strings
const CURSOR_HIDE = '\033[?25l';
const CURSOR_SHOW = '\033[?25h';
const CLEAR       = '\033[2J';
const ERASE_LN    = '\033[K'
const RESET       = "\x1b[0m";
const RESET_POS   = '\033[1;0H';
const FG_BLACK    = "\x1b[30m";
const FG_RED      = "\x1b[31m";
const FG_GREEN    = "\x1b[32m";
const FG_YELLOW   = "\x1b[33m";
const FG_BLUE     = "\x1b[34m";
const FG_MAGENTA  = "\x1b[35m";
const FG_CYAN     = "\x1b[36m";
const FG_WHITE    = "\x1b[37m";
const BG_BLACK    = "\x1b[40m";
const BG_RED      = "\x1b[41m";
const BG_GREEN    = "\x1b[42m";
const BG_YELLOW   = "\x1b[43m";
const BG_BLUE     = "\x1b[44m";
const BG_MAGENTA  = "\x1b[45m";
const BG_CYAN     = "\x1b[46m";
const BG_WHITE    = "\x1b[47m";

// load config
var   fs     = require('fs');
const config = JSON.parse(fs.readFileSync('./flake.json', 'utf8'));
const menu   = config.menu.sort(function(a, b) {  // save the menu and sort it
	if (a.code < b.code){
		return -1;
	}
	if (a.code > b.code){
		return 1;
	}
	return 0;
});
var submenu = menu;

// prepair the tty
var stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');
process.stdout.write(CURSOR_HIDE);

// setup variables
var location    = ['menu', ''];
var order       = [];
var exitConfirm = false;
var err         = [];

render();  // render the initial screen

stdin.on('data', function(key){
	key = key.toLowerCase();

	// give you a way to escape
	if (exitConfirm) {
		if (key === '\u0003' || key === '\u0004') {
			process.stdout.write(CURSOR_SHOW + '\n');
			process.exit();
		} else {
			exitConfirm = false;
		}
	} else if (key === '\u0003' || key === '\u0004') {
		exitConfirm = true;
		err.push('To exit, press ^C again or ^D');
		render();
		return;
	}

	if (location[0] == 'menu') {
		if (key == '\u007f') {
			location[1] = location[1].slice(0, -1);
		} else if (key == '\u001b') {
			location[1] = '';
		} else {
			location[1] += key;
		}

		submenu = [];
		for (let i = 0; i < menu.length; i++) {
			const item = menu[i];
			if (item.code.startsWith(location[1])) {
				submenu.push(item);
			}
		}
		if (submenu.length == 0) {
			err.push('No items matching "'+location[1]+'"')
			location[1] = location[1].slice(0, -1);
			for (let i = 0; i < menu.length; i++) {
				const item = menu[i];
				if (item.code.startsWith(location[1])) {
					submenu.push(item);
				}
			}
		}
	}

	// console.log(key.charCodeAt(0).toString(16));
	render();
});

function render() {
	process.stdout.write(RESET + CLEAR + RESET_POS);  // clear and reset

	// print the menu
	for (let i = 0; i < submenu.length; i++) {
		const item = submenu[i];
		process.stdout.write(item.code + '	- ' + item.name + '\n');
	}

	// errors
	process.stdout.write('\033['+process.stdout.rows+';0H' + FG_RED);  // move to bottom left and set to red
	for (let i = 0; i < err.length; i++) {
		process.stdout.write(ERASE_LN + err[i] + '\033['+process.stdout.rows+';0H\033['+(i+1)+'A');  // erase line, print message, and move up 1
	}
	process.stdout.write(RESET);
	err = [];
}
