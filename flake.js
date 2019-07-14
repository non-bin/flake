#!/usr/bin/node

var fs = require('fs');

// controll strings for terminal
const t = {};

t.FG_BLACK    = '\x1b[30m';
t.FG_RED      = '\x1b[31m';
t.FG_GREEN    = '\x1b[32m';
t.FG_YELLOW   = '\x1b[33m';
t.FG_BLUE     = '\x1b[34m';
t.FG_MAGENTA  = '\x1b[35m';
t.FG_CYAN     = '\x1b[36m';
t.FG_WHITE    = '\x1b[37m';
t.BG_BLACK    = '\x1b[40m';
t.BG_RED      = '\x1b[41m';
t.BG_GREEN    = '\x1b[42m';
t.BG_YELLOW   = '\x1b[43m';
t.BG_BLUE     = '\x1b[44m';
t.BG_MAGENTA  = '\x1b[45m';
t.BG_CYAN     = '\x1b[46m';
t.DIM         = '\x1b[2m';
t.BG_WHITE    = '\x1b[47m';
t.CURSOR_HIDE = '\033[?25l';
t.CURSOR_SHOW = '\033[?25h';
t.CLEAR       = '\033[2J';
t.ERASE_LN    = '\033[K';
t.RESET       = '\x1b[0m';
t.RESET_POS   = '\033[1;0H';
t.SELECTED    = t.FG_BLACK + t.BG_WHITE;
t.CURSOR_CHAR = '\u2588';
t.CURSOR_TO   = function(x, y) {
	process.stdout.write('\033['+x+';'+y+'H');
}

// controll strings for printer
const p = {};

p.NUL   = '\u0000';         // prefixes
p.LF    = '\u000A';
p.ESC   = '\u001B';
p.GS    = '\u001D';
p.RESET = p.ESC+'@';        // reset everything
p.JF_L  = p.ESC+'a\u0000';  // justify
p.JF_C  = p.ESC+'a\u0001';
p.JF_R  = p.ESC+'a\u0002';
p.UL_0  = p.ESC+'-\u0000';  // underline
p.UL_1  = p.ESC+'-\u0001';
p.UL_2  = p.ESC+'-\u0002';
p.BLD_0 = p.ESC+'E\u0000';  // bold
p.BLD_1 = p.ESC+'E\u0001';
p.DS_0  = p.ESC+'G\u0000';  // double strike
p.DS_1  = p.ESC+'G\u0001';
p.FNT_0 = p.ESC+'M\u0000';  // font
p.FNT_1 = p.ESC+'M\u0001';
p.FNT_2 = p.ESC+'M\u0002';


// load config
const config  = JSON.parse(fs.readFileSync('./flake.json', 'utf8'));  // read and parse the config file
const menu    = sortByKey(config.menu);                               // sort the menu
var   submenu = menu;                                                 // load an initial value for the submenu

// prepair the tty
process.stdin.setRawMode(true);  // don't require a newline
process.stdin.resume();
process.stdin.setEncoding();        // get usefull feedback
process.stdout.write(t.CURSOR_HIDE);  // hide the cursor

// setup variables
var location    = ['menu', ''];                                            // where the user is
var order       = {'price': 0, 'items': [], 'comment': false};             // store the order
var item        = {'code': '', 'options': [], 'quantity': 1, 'price': 0, 'comment': false};  // information on the current item
var exitConfirm = false;                                                   // require 2 ^c/^d to exit
var err         = [];                                                      // store errors to be rendered

render();  // render the initial screen

// when a key is pressed
process.stdin.on('data', function(key){
	key = key.toLowerCase();

	// give you a way to escape
	if (exitConfirm) {
		if (key === '\u0003' || key === '\u0004') {
			process.stdout.write(t.CURSOR_SHOW + '\n');  // show the cursor
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
		if (key == config.keyBinds.comment) {  // add a comment
			location[0] = 'itemComment';
			if (item.comment === false) {
				item.comment = '';
			}
			render();
			return;
		} else if (key == config.keyBinds.back) {  // go back
			if (typeof(location[1] === 'number')) {  // if we came from the order
				location[0] = 'order';
				render();
				return;
			} else {
				location = ['menu', ''];  // go back to the menu
				key      = '';            // don't register the key press twice
			}
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
				// calculate price
				item.price = menu[item.code].price;  // set the initial price
				for (let i = 0; i < item.options.length; i++) {  // apply the price of each option
					if (item.options[i] && menu[item.code].options[i].values[item.options[i]].price) {
						item.price += menu[item.code].options[i].values[item.options[i]].price;
					}
				}
				item.price *= item.quantity;  // take into account quantity
				if (item.price < 0) {  // prevent negative prices
					item.price = 0;
				}

				// add to the order
				if (typeof(location[1]) === 'number') {  // if the item came from the order
					order.items[location[1]] = clone(item);  // put it back
					location = ['order', ''];  // go back to the menu
				} else {
					order.items.push({});
					order.items[order.items.length-1] = clone(item);
					location = ['menu', ''];  // go back to the menu
				}

				key = '';  // don't register key press twice

				// update total price
				order.price = 0;
				for (let i = 0; i < order.items.length; i++) {
					order.price += order.items[i].price;
				}
			}
		}
	}

	// menu
	if (location[0] == 'menu') {
		if (key == config.keyBinds.comment) {  // edit the order comment
			location[0] = 'orderComment';
			if (order.comment === false) {
				order.comment = '';
			}
			render();
			return;
		} else if (key == config.keyBinds.order) {  // select an item in the order to edit
			if (order.items.length > 0) {  // only if order has at least 1 item
				location[0] = 'order';
				location[1] = 0;               // select the first item
				submenu     = filterMenu('');  // reset the menu filter
			} else {
				err.push('unable to edit order, it is empty.');
			}
			render();
			return;
		} else {
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

				// reset the item variable
				item.code     = location[1];
				item.options  = [];
				item.quantity = 1;
				item.comment  = false;

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
	}

	// order comment
	if (location[0] == 'orderComment') {
		if (key == config.keyBinds.backspace) {  // delete a char from the comment
			order.comment = order.comment.slice(0, -1);
		} else if (key == config.keyBinds.back || key == config.keyBinds.comment || key == config.keyBinds.confirm) {  // clear the filter string
			location[0] = 'menu';
			if (order.comment == '') {
				order.comment = false;
			}
		} else {
			order.comment += key;
		}
	}

	// item comment
	if (location[0] == 'itemComment') {
		if (key == config.keyBinds.backspace) {  // delete a char from the comment
			item.comment = item.comment.slice(0, -1);
		} else if (key == config.keyBinds.back || key == config.keyBinds.comment || key == config.keyBinds.confirm) {  // clear the filter string
			location[0] = 'item';
			if (item.comment == '') {
				item.comment = false;
			}
		} else {
			item.comment += key;
		}
	}

	// order
	if (location[0] == 'order') {
		if (key == config.keyBinds.order || key == config.keyBinds.back) {  // return to menu
			location[0] = 'menu';
			location[1] = '';
			render();
			return;
		} else if (key == config.keyBinds.confirm) {  // go back to item mode to edit an item
			item = clone(order.items[location[1]]);  // copy item from order
			location[0] = 'item';  // move to item mode
		} else if (key == config.keyBinds.delete || key == config.keyBinds.backspace) {  // delete the item
			order.items.splice(location[1], 1);

			if (order.items.length == 0) {  // if the order is now empty, return to the menu
				location[0] = 'menu';
				location[1] = '';
				render();
				return;
			}
		} else if (key == config.keyBinds.arrUp) {  // move selection up
			location[1]--;
		} else if (key == config.keyBinds.arrDown) {  // move selection down
			location[1]++;
		}

		// wrap around
		if (location[1] < 0) {
			location[1] = order.items.length-1;
		} else if (location[1] > order.items.length-1) {
			location[1] = 0;
		}
	}

	render();
});

/**
 * Respond to resizes
 */
process.stdout.on('resize', () => {
	render();
});


/**
 * Render the display based on location
 */
function render() {
	process.stdout.write(t.RESET + t.CLEAR + t.RESET_POS);  // clear and reset
	var lineNo = 0;

	// left hand side
	switch (location[0]) {
	case 'orderComment':
	case 'order':
	case 'menu':
		for (const code in submenu) {
			if (submenu.hasOwnProperty(code)) {
				process.stdout.write(code + '	- ' + submenu[code].name + '\n');
			}
		}

		if (location[0] == 'menu') {
			t.CURSOR_TO(process.stdout.rows, 0);
			process.stdout.write('> ' + location[1] + t.CURSOR_CHAR);
		} else if (location[0] != 'order') {
			t.CURSOR_TO(process.stdout.rows, 0);
			process.stdout.write('> ' + location[1]);
		}
		break;

	case 'itemComment':
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
							process.stdout.write(t.SELECTED + code + ' - ' + menu[item.code].options[i].values[code].name + price + t.RESET + '  ');
						} else {
							process.stdout.write(code + ' - ' + menu[item.code].options[i].values[code].name + price + '  ');
						}
					}
				}

				process.stdout.write('\n\n');
			}
		}

		if (item.comment !== false) {
			process.stdout.write('COMMENT:\n' + item.comment);
			if (location[0] == 'itemComment') {
				process.stdout.write(t.CURSOR_CHAR);
			}
		}

		break;
	}


	// right hand side
	t.CURSOR_TO(1, process.stdout.columns-config.orderWidth);  // position cursor
	process.stdout.write('Order:');  // print title

	lineNo = 3;

	// each item in the order
	for (let i = 0; i < order.items.length; i++) {
		t.CURSOR_TO(lineNo, process.stdout.columns-config.orderWidth);  // position cursor
		if (location[0] == 'order' && location[1] == i) {
			process.stdout.write(t.SELECTED);  // if the item is selected
		}
		process.stdout.write(menu[order.items[i].code].name + ' x' + order.items[i].quantity + ' $' + order.items[i].price + t.RESET);  // print NAME xQUANTITY $PRICE

		for (let j = 0; j < order.items[i].options.length; j++) {
			if (order.items[i].options[j]) {
				lineNo++;
				t.CURSOR_TO(lineNo, process.stdout.columns-config.orderWidth);  // position cursor
				process.stdout.write(t.DIM + ' ' + menu[order.items[i].code].options[j].values[order.items[i].options[j]].name + t.RESET);
			}
		}
		if (order.items[i].comment) {  // if the item has a comment
			lineNo++;
			t.CURSOR_TO(lineNo, process.stdout.columns-config.orderWidth);  // position cursor
			process.stdout.write(t.DIM + ' ' + order.items[i].comment + t.RESET);
		}

		lineNo += 2;
	}

	// order comment
	if (order.comment !== false) {
		t.CURSOR_TO(lineNo, process.stdout.columns-config.orderWidth);  // position cursor
		process.stdout.write('COMMENT');
		lineNo++;
		t.CURSOR_TO(lineNo, process.stdout.columns-config.orderWidth);  // position cursor
		process.stdout.write(t.DIM + ' ' + order.comment);
		if (location[0] == 'orderComment') {
			process.stdout.write(t.CURSOR_CHAR);
		}
		process.stdout.write(t.RESET);

		lineNo += 2;
	}

	// total price
	t.CURSOR_TO(process.stdout.rows, process.stdout.columns-config.orderWidth);  // position at the bottom of the order
	process.stdout.write('Price: $' + order.price);


	// errors
	t.CURSOR_TO(process.stdout.rows,0);
	process.stdout.write(t.FG_RED);  // move to bottom left and set to red
	for (let i = 0; i < err.length; i++) {
		process.stdout.write(t.ERASE_LN + err[i]);
		t.CURSOR_TO(process.stdout.rows-i, 0);// erase line, print message, and move up 1
	}
	process.stdout.write(t.RESET);
	err = [];
}


function receptInit(path) {
	var printer = {};
	printer.path = path;
	printer.print = function(data) {
		fs.writeFile(path, data);
	}

	printer.print(p.RESET);

	return printer;
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


/**
 * Write an entry to the log
 *
 * @param {String} logString string to log
 */
function log(logString) {
	fs.writeFile('./flake.log', logString + '\n', {flag: 'a'}, function() {});
}


/**
 * Clone an object recursively
 *
 * @param {*} obj input object
 * @returns obj with references to obj removed
 */
function clone(obj) {
	if (null == obj || "object" != typeof obj) return obj;
	var copy = obj.constructor();
	for (var attr in obj) {
		if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
	}
	return copy;
}
