#!/usr/bin/node

var fs = require('fs');

// controll strings
const FG_BLACK    = '\x1b[30m';
const FG_RED      = '\x1b[31m';
const FG_GREEN    = '\x1b[32m';
const FG_YELLOW   = '\x1b[33m';
const FG_BLUE     = '\x1b[34m';
const FG_MAGENTA  = '\x1b[35m';
const FG_CYAN     = '\x1b[36m';
const FG_WHITE    = '\x1b[37m';
const BG_BLACK    = '\x1b[40m';
const BG_RED      = '\x1b[41m';
const BG_GREEN    = '\x1b[42m';
const BG_YELLOW   = '\x1b[43m';
const BG_BLUE     = '\x1b[44m';
const BG_MAGENTA  = '\x1b[45m';
const BG_CYAN     = '\x1b[46m';
const DIM         = '\x1b[2m';
const BG_WHITE    = '\x1b[47m';
const CURSOR_HIDE = '\033[?25l';
const CURSOR_SHOW = '\033[?25h';
const CLEAR       = '\033[2J';
const ERASE_LN    = '\033[K';
const RESET       = '\x1b[0m';
const RESET_POS   = '\033[1;0H';
const SELECTED    = FG_BLACK + BG_WHITE;

// load config
const config  = JSON.parse(fs.readFileSync('./flake.json', 'utf8'));  // read and parse the config file
const menu    = sortByKey(config.menu);                               // sort the menu
var   submenu = menu;                                                 // load an initial value for the submenu

// prepair the tty
process.stdin.setRawMode(true);  // don't require a newline
process.stdin.resume();
process.stdin.setEncoding();        // get usefull feedback
process.stdout.write(CURSOR_HIDE);  // hide the cursor

// setup variables
var location    = ['menu', ''];                 // where the user is
var order       = [];                           // store the order
var exitConfirm = false;                        // require 2 ^c/^d to exit
var err         = [];                           // store errors to be rendered
var item        = {'code': '', 'options': [], 'quantity': 1, 'price': 0};  // information on the current item

render();  // render the initial screen

// when a key is pressed
process.stdin.on('data', function(key){
	key = key.toLowerCase();

	// give you a way to escape
	if (exitConfirm) {
		if (key === '\u0003' || key === '\u0004') {
			process.stdout.write(CURSOR_SHOW + '\n');  // show the cursor
			process.exit();                            // then exit
		} else {
			exitConfirm = false;
		}
	} else if (key === '\u0003' || key === '\u0004') {
		exitConfirm = true;
		err.push('To exit, press ^C again or ^D');  // confirm the exit
		render();
		return;
	}

	// item
	if (location[0] == 'item') {
		if (key == config.keyBinds.back) {
			location = ['menu', ''];  // go back to the menu
			key      = '';            // don't reister the key press twice
		} else {
			// options
			if (menu[item.code].options) {
				for (let i = 0; i < menu[item.code].options.length; i++) {  // for each set of options
					for (const code in menu[item.code].options[i].values) {  // for each value
						if (menu[item.code].options[i].values.hasOwnProperty(code)) {
							if (code == key) {
								if (menu[item.code].options[i].type == 'toggle') {  // if the potion is a toggle
									if (item.options[i] == key) {  // toggle it
										item.options[i] = '';
									} else {
										item.options[i] = key;
									}
								} else {  // if not, set it
									item.options[i] = key;
								}
							}
						}
					}
				}
			}

			// quantity
			if (config.keyBinds.quantityInc.includes(key)) {  // increment
				item.quantity++;
			} else if (config.keyBinds.quantityDec.includes(key) && item.quantity > 1) {  // decrement
				item.quantity--;
			}

			// add to order
			if (key == config.keyBinds.confirm) {
				item.price = menu[item.code].price;  // set the initial price
				for (let i = 0; i < item.options.length; i++) {  // apply the price of each option
					if (item.options[i] != '' && menu[item.code].options[i].values[item.options[i]].price) {
						item.price += menu[item.code].options[i].values[item.options[i]].price;
					}
				}

				item.price *= item.quantity;  // take into account quantity

				if (item.price < 0) {  // prevent negative prices
					item.price = 0;
				}

				order.push({});
				Object.assign(order[order.length-1], item);  // add to the order

				location = ['menu', ''];  // go back to the menu
				key      = '';            // don't reister the key press twice
			}
		}
	}

	// finishing
	if (location[0] == 'finishing') {

	}

	// menu
	if (location[0] == 'menu') {
		if (key == config.keyBinds.backspace) {  // delete a filter char
			location[1] = location[1].slice(0, -1);
		} else if (key == config.keyBinds.back) {  // clear the filter string
			location[1] = '';
		} else {
			location[1] += key;
		}

		// filter the menu based on input string
		submenu = filterMenu(location[1]);

		// if the filtered menu is empty, throw an error and revert
		if (Object.keys(submenu).length == 0) {
			err.push('No items matching "'+location[1]+'"');
			location[1] = location[1].slice(0, -1);

			submenu = filterMenu(location[1]);
		}

		// if only one item is left
		if (Object.keys(submenu).length == 1) {
			location     = ['item', location[1]];
			item.code    = location[1];
			item.options = [];

			if (menu[location[1]].options) {  // save the selected options to the item
				for (let i = 0; i < menu[location[1]].options.length; i++) {
					if (menu[location[1]].options[i].selected) {
						item.options.push(menu[location[1]].options[i].selected);
					} else {
						item.options.push('');
					}
				}
			}
		}
	}

	render();
});


/**
 * Render the display based on location
 */
function render() {
	process.stdout.write(RESET + CLEAR + RESET_POS);  // clear and reset
	var lineNo = 0;

	// left hand side
	switch (location[0]) {
	case 'menu':
		for (const code in submenu) {
			if (submenu.hasOwnProperty(code)) {
				process.stdout.write(code + '	- ' + submenu[code].name + '\n');
			}
		}

		process.stdout.write('\033['+process.stdout.rows+';0H> ' + location[1]);
		break;

	case 'item':
		process.stdout.write(menu[item.code].name + '\n\n');  // name
		process.stdout.write('Quantity: ' + item.quantity + '\n\n');  // quantity

		if (menu[item.code].options) {
			for (let i = 0; i < menu[item.code].options.length; i++) {
				process.stdout.write(menu[item.code].options[i].name + '\n');  // option name

				for (const code in menu[item.code].options[i].values) {
					if (menu[item.code].options[i].values.hasOwnProperty(code)) {
						if (menu[item.code].options[i].values[code].price > 0) {
							price = ' (+$' + Math.abs(menu[item.code].options[i].values[code].price) + ')';
						} else if (menu[item.code].options[i].values[code].price < 0) {
							price = ' (-$' + Math.abs(menu[item.code].options[i].values[code].price) + ')';
						} else {
							price = '';
						}

						if (item.options[i] == code) {
							process.stdout.write(SELECTED + code + ' - ' + menu[item.code].options[i].values[code].name + price + RESET + '  ');
						} else {
							process.stdout.write(code + ' - ' + menu[item.code].options[i].values[code].name + price + '  ');
						}
					}
				}

				process.stdout.write('\n\n');
			}
		}

		break;
	}

	// right hand side
	process.stdout.write('\033[1;'+(process.stdout.columns-60)+'H');  // position cursor
	process.stdout.write('Order:');  // print title

	lineNo = 3;

	// print each item
	for (let i = 0; i < order.length; i++) {
		process.stdout.write('\033[' + lineNo + ';' + (process.stdout.columns-60) + 'H');  // position cursor
		process.stdout.write(menu[order[i].code].name + ' x' + order[i].quantity + ' $' + order[i].price);

		for (let j = 0; j < order[i].options.length; j++) {
			if (order[i].options[j] != '') {
				lineNo++;
				process.stdout.write('\033['+ lineNo +';'+ (process.stdout.columns-60) +'H');  // position cursor
				process.stdout.write(DIM + ' ' + menu[order[i].code].options[j].values[order[i].options[j]].name + RESET);
			}
		}

		lineNo += 2;
	}


	// errors
	process.stdout.write('\033['+process.stdout.rows+';0H' + FG_RED);  // move to bottom left and set to red
	for (let i = 0; i < err.length; i++) {
		process.stdout.write(ERASE_LN + err[i] + '\033[' + process.stdout.rows + ';0H\033[' + (i+1) + 'A');  // erase line, print message, and move up 1
	}
	process.stdout.write(RESET);
	err = [];
}


/**
 * Filter the menu based on filter string
 *
 * @param {String} filterStr search string
 * @returns all menu items matching the filter string
 */
function filterMenu(filterStr) {
	var submenu = {};
	for (const code in menu) {
		if (menu.hasOwnProperty(code)) {
			const item = menu[code];
			if (code.startsWith(filterStr)) {
				submenu[code] = item;
			}
		}
	}

	return submenu;
}


/**
 * Sort an object alphabetically by keys
 *
 * @param {*} unordered input object
 * @returns sorted object
 */
function sortByKey(unordered){
	var ordered = {};
	Object.keys(unordered).sort().forEach(function(key) {
		ordered[key] = unordered[key];
	});

	return ordered;
}
