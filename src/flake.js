#!/usr/bin/node

var   fs          = require('fs');
const render      = require('./render.js').render;
const printRecept = require('./print.js').printRecept;

// controll strings
CURSOR_HIDE = '\033[?25l';
CURSOR_SHOW = '\033[?25h';


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
var location    = ['menu', ''];                                            // where the user is
var order       = {'price': 0, 'items': [], 'comment': false, 'name': '', 'date': 0};             // store the order
var item        = {'code': '', 'options': [], 'quantity': 1, 'price': 0, 'comment': false};  // information on the current item
var exitConfirm = false;                                                   // require 2 ^c/^d to exit
var err         = [];                                                      // store errors to be rendered

renderWrap();  // render the initial screen

// when a key is pressed
process.stdin.on('data', function(key){
	var keyLower = key.toLowerCase();

	err = [];  // clear the err object

	// give you a way to escape
	if (exitConfirm) {
		if (keyLower === '\u0003' || keyLower === '\u0004') {
			process.stdout.write(CURSOR_SHOW + '\n');  // show the cursor
			process.exit();                            // then exit
		} else {
			exitConfirm = false;
		}
	} else if (keyLower === '\u0003' || keyLower === '\u0004') {
		exitConfirm = true;
		err.push('To exit, press ^C again or ^D');  // confirm the exit
		renderWrap();
		return;
	}

	// item
	if (location[0] == 'item') {
		if (keyLower == config.keyBinds.comment) {  // add a comment
			location[0] = 'itemComment';
			if (item.comment === false) {
				item.comment = '';
			}
			renderWrap();
			return;
		} else if (keyLower == config.keyBinds.back) {  // go back
			if (typeof(location[1]) === 'number') {  // if we came from the order
				location[0] = 'order';
				renderWrap();
				return;
			} else {
				location = ['menu', ''];    // go back to the menu
				submenu  = filterMenu('');  // reset the menu filter
				renderWrap();
				return;
			}
		} else {
			// options
			if (menu[item.code].options) {
				for (let i = 0; i < menu[item.code].options.length; i++) {  // for each set of options
					for (const code in menu[item.code].options[i].values) {  // for each value
						if (menu[item.code].options[i].values.hasOwnProperty(code)) {
							if (code == keyLower) {
								if (menu[item.code].options[i].type == 'toggle') {  // if the option is a toggle
									if (item.options[i].includes(keyLower)) {  // toggle it
										item.options[i].splice(item.options[i].indexOf(keyLower), 1);
									} else {
										item.options[i].push(keyLower);
									}
								} else {  // if not, set it
									item.options[i] = keyLower;
								}
							}
						}
					}
				}
			}

			// quantity
			if (config.keyBinds.quantityInc.includes(keyLower)) {  // increment
				item.quantity++;
			} else if (config.keyBinds.quantityDec.includes(keyLower) && item.quantity > 1) {  // decrement
				item.quantity--;
			}

			// add to order
			if (keyLower == config.keyBinds.confirm) {
				// calculate price
				item.price = menu[item.code].price;  // set the initial price
				for (let i = 0; i < item.options.length; i++) {  // apply the price of each option
					if (item.options[i]) {
						if (menu[item.code].options[i].type == 'toggle') {
							for (let j = 0; j < item.options[i].length; j++) {
								if (menu[item.code].options[i].values[item.options[i][j]].price) {
									item.price += menu[item.code].options[i].values[item.options[i][j]].price;
								}
							}
						} else {
							if (menu[item.code].options[i].values[item.options[i]].price) {
								item.price += menu[item.code].options[i].values[item.options[i]].price;
							}
						}
					}
				}
				item.price *= item.quantity;  // take into account quantity
				if (item.price < 0) {  // prevent negative prices
					item.price = 0;
				}

				// add to the order
				if (typeof(location[1]) === 'number') {  // if the item came from the order
					order.items[location[1]] = clone(item);  // put it back
					location[0] = 'order';  // go back to the menu
				} else {
					order.items.push({});
					order.items[order.items.length-1] = clone(item);
					location = ['menu', ''];  // go back to the menu
				}

				keyLower = '';  // don't register key press twice

				// update total price
				order.price = 0;
				for (let i = 0; i < order.items.length; i++) {
					order.price += order.items[i].price;
				}
			}
		}
	}


	// finishing
	if (location[0] == 'finish') {
		if (location[1] == 'name') {
			if (keyLower == config.keyBinds.backspace) {  // delete a char from the name
				order.name = order.name.slice(0, -1);
			} else if (keyLower == config.keyBinds.back) {  // go back to the menu
				location = ['menu', ''];
				renderWrap();
				return;
			} else if (keyLower == config.keyBinds.confirm) {  // confirm and go to the next stage of finishing
				// location = ['finish', 'pay', 'cash'];
				// renderWrap();
				order.date = new Date();
				receptWrapper('ticket', order);
				return;
			} else {
				order.name += key;  // we want case sensitivity so use key
			}
		} else if (location[1] == 'pay') {
			if (keyLower == config.keyBinds.back) {  // go back to name
				location[1] = 'name';
				renderWrap();
				return;
			}
		}
	}


	// menu
	if (location[0] == 'menu') {
		if (keyLower == config.keyBinds.comment) {  // edit the order comment
			location[0] = 'orderComment';
			if (order.comment === false) {
				order.comment = '';
			}
			renderWrap();
			return;
		} else if (keyLower == config.keyBinds.confirm) {  // finishing
			if (order.items.length == 0) {
				err.push('Cannot finish order, it is empty.');
				renderWrap();
				return;
			}

			location = ['finish', 'name'];
			renderWrap();
			return;
		} else if (keyLower == config.keyBinds.order) {  // select an item in the order to edit
			if (order.items.length > 0) {  // only if order has at least 1 item
				location[0] = 'order';
				location[1] = 0;               // select the first item
				submenu     = filterMenu('');  // reset the menu filter
			} else {
				err.push('unable to edit order, it is empty.');
			}
			renderWrap();
			return;
		} else {
			if (keyLower == config.keyBinds.backspace) {  // delete a filter char
				location[1] = location[1].slice(0, -1);
			} else if (keyLower == config.keyBinds.back) {  // clear the filter string
				location[1] = '';
			} else {
				location[1] += keyLower;
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
			if (Object.keys(submenu).length == 1 && Object.keys(submenu)[0] == location[1]) {
				location     = ['item', Object.keys(submenu)[0]];

				// reset the item variable
				item.code     = location[1];
				item.options  = [];
				item.quantity = 1;
				item.comment  = false;

				if (menu[location[1]].options) {  // save the selected options to the item
					for (let i = 0; i < menu[location[1]].options.length; i++) {
						if (menu[location[1]].options[i].type == 'toggle') {
							if (menu[location[1]].options[i].selected) {
								item.options.push(menu[location[1]].options[i].selected);
							} else {
								item.options.push([]);
							}
						} else {
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
	}

	// order comment
	if (location[0] == 'orderComment') {
		if (keyLower == config.keyBinds.backspace) {  // delete a char from the comment
			order.comment = order.comment.slice(0, -1);
		} else if (keyLower == config.keyBinds.back || keyLower == config.keyBinds.comment || keyLower == config.keyBinds.confirm) {  // clear the filter string
			location[0] = 'menu';
			if (order.comment == '') {
				order.comment = false;
			}
		} else {
			order.comment += key;  // we want case sensitivity so use key
		}
	}

	// item comment
	if (location[0] == 'itemComment') {
		if (keyLower == config.keyBinds.backspace) {  // delete a char from the comment
			item.comment = item.comment.slice(0, -1);
		} else if (keyLower == config.keyBinds.back || keyLower == config.keyBinds.comment || keyLower == config.keyBinds.confirm) {  // clear the filter string
			location[0] = 'item';
			if (item.comment == '') {
				item.comment = false;
			}
		} else {
			item.comment += key;  // we want case sensitivity so use key
		}
	}

	// order
	if (location[0] == 'order') {
		if (keyLower == config.keyBinds.order || keyLower == config.keyBinds.back) {  // return to menu
			location[0] = 'menu';
			location[1] = '';
			renderWrap();
			return;
		} else if (keyLower == config.keyBinds.confirm) {  // go back to item mode to edit an item
			item = clone(order.items[location[1]]);  // copy item from order
			location[0] = 'item';  // move to item mode
		} else if (keyLower == config.keyBinds.delete || keyLower == config.keyBinds.backspace) {  // delete the item
			order.items.splice(location[1], 1);

			if (order.items.length == 0) {  // if the order is now empty, return to the menu
				location[0] = 'menu';
				location[1] = '';
				renderWrap();
				return;
			}
		} else if (keyLower == config.keyBinds.arrUp) {  // move selection up
			location[1]--;
		} else if (keyLower == config.keyBinds.arrDown) {  // move selection down
			location[1]++;
		}

		// wrap around
		if (location[1] < 0) {
			location[1] = order.items.length-1;
		} else if (location[1] > order.items.length-1) {
			location[1] = 0;
		}
	}

	renderWrap();
});

/**
 * Respond to resizes
 */
process.stdout.on('resize', () => {
	renderWrap();
});


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


/**
 * Abbreviate this long render call
 */
function renderWrap() {
	render(location, submenu, config, order, err, menu, item);
}

function receptWrapper(type, content, options = undefined) {
	if (options) {
		printRecept(type, content, location, submenu, config, order, err, menu, item, options);
	} else {
		printRecept(type, content, location, submenu, config, order, err, menu, item);
	}
}
