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
t.BG_WHITE    = '\x1b[47m';
t.DIM         = '\x1b[2m';
t.BRIGHT      = '\x1b[1m';
t.UNDERLINE   = '\x1b[4m';
t.BLINK       = '\x1b[5m';
t.CLEAR       = '\033[2J';
t.ERASE_LN    = '\033[K';
t.RESET       = '\x1b[0m';
t.RESET_POS   = '\033[1;0H';
t.SELECTED    = t.FG_BLACK+t.BG_WHITE;
t.CURSOR_CHAR = '\u2588';
t.CURSOR_TO   = function(x, y) {
	process.stdout.write('\033['+x+';'+y+'H');
}

/**
 * Render the display based on location
 */
module.exports.render = function(location, submenu, config, order, err, menu, item) {
	process.stdout.write(t.RESET+t.CLEAR+t.RESET_POS);  // clear and reset
	var lineNo = 0;

	// left hand side
	switch (location[0]) {
	case 'orderComment':
	case 'order':
	case 'menu':
		for (const code in submenu) {
			if (submenu.hasOwnProperty(code)) {
				process.stdout.write(code+'	- '+submenu[code].name+'\n');
			}
		}

		if (location[0] == 'menu') {
			t.CURSOR_TO(process.stdout.rows, 0);
			process.stdout.write('> '+location[1]+t.CURSOR_CHAR);
		} else if (location[0] != 'order') {
			t.CURSOR_TO(process.stdout.rows, 0);
			process.stdout.write('> '+location[1]);
		}
		break;

	case 'itemComment':
	case 'item':
		var price             = '';
		var selected          = '';
		var codeMaxLen        = [];
		var nameMaxLen        = [];
		var priceMaxLen       = [];
		var codeMaxLenGlob    = 0;
		var nameMaxLenGlob    = 0;
		var priceMaxLenGlob   = 0;
		var noOptionValueCols = 1;
		var colNo             = 0;

		process.stdout.write(menu[item.code].name+' $'+menu[item.code].price.toFixed(2)+'\n\n');  // name
		process.stdout.write('Quantity: '+item.quantity+'\n\n');  // quantity

		if (menu[item.code].options) {
			// determine the max length of all attributes
			for (let optionNo = 0; optionNo < menu[item.code].options.length; optionNo++) {
				for (const optionValueCode in menu[item.code].options[optionNo].values) {
					if (menu[item.code].options[optionNo].values.hasOwnProperty(optionValueCode)) {
						const value = menu[item.code].options[optionNo].values[optionValueCode];

						// code
						if (optionValueCode.length > codeMaxLenGlob) {
							codeMaxLenGlob = optionValueCode.length;
						}

						// name
						if (value.name.length > nameMaxLenGlob) {
							nameMaxLenGlob = value.name.length;
						}

						// price
						if (value.price.toString().length+2 > priceMaxLenGlob) {
							priceMaxLenGlob = value.price.toString().length+2;
						}
					}
				}
			}

			noOptionValueCols = Math.floor((process.stdout.columns-config.orderWidth) / (codeMaxLenGlob+nameMaxLenGlob+priceMaxLenGlob+2));
			noOptionValueCols = Math.floor((process.stdout.columns-config.orderWidth) / (codeMaxLenGlob+nameMaxLenGlob+priceMaxLenGlob+2+noOptionValueCols));

			for (let optionNo = 0; optionNo < menu[item.code].options.length; optionNo++) {  // for each option
				codeMaxLen  = [];
				nameMaxLen  = [];
				priceMaxLen = [];
				colNo       = 0;

				for (const optionValueCode in menu[item.code].options[optionNo].values) {
					if (menu[item.code].options[optionNo].values.hasOwnProperty(optionValueCode)) {
						const value = menu[item.code].options[optionNo].values[optionValueCode];

						if (codeMaxLenGlob == undefined || nameMaxLenGlob == undefined || priceMaxLenGlob == undefined) {
							codeMaxLenGlob = 0;
							nameMaxLenGlob = 0;
							priceMaxLenGlob = 0;
						}

						// code
						if (optionValueCode.length > codeMaxLenGlob) {
							codeMaxLenGlob = optionValueCode.length;
						}

						// name
						if (value.name.length > nameMaxLenGlob) {
							nameMaxLenGlob = value.name.length;
						}

						// price
						if (value.price.toString().length+2 > priceMaxLenGlob) {
							priceMaxLenGlob = value.price.toString().length+2;
						}

						if (colNo > noOptionValueCols-2) {  // if we have reached the end of the row (-2 because colNo is 0 indexed but noOptionValueCols is not)
							colNo = 0;
						} else {
							colNo++;
						}
					}
				}

				colNo = 0;

				process.stdout.write(t.RESET+t.UNDERLINE+menu[item.code].options[optionNo].name+'\n');

				for (const optionValueCode in menu[item.code].options[optionNo].values) {  // for each value
					if (menu[item.code].options[optionNo].values.hasOwnProperty(optionValueCode)) {
						const value = menu[item.code].options[optionNo].values[optionValueCode];

						if (item.options[optionNo].includes(optionValueCode)) {
							selected = t.SELECTED;
						} else {
							selected = '';
						}

						if (colNo > 0) {
							process.stdout.write(t.RESET+t.DIM+'  |  ');
						}
						process.stdout.write(t.RESET+selected+t.DIM+ optionValueCode.padEnd(codeMaxLenGlob)+' ');  // code
						process.stdout.write(t.RESET+t.BRIGHT+selected+ value.name.padEnd(nameMaxLenGlob)+' ');  // name

						price = '$'+Math.abs(value.price);  // price
						if (value.price < 0) {
							price = '-'+price;
						} else if (value.price >= 0) {
							price = '+'+price;
						}
						process.stdout.write(t.RESET+selected+t.DIM+price.padEnd(priceMaxLenGlob)+''+t.RESET);

						if (colNo > noOptionValueCols-2) {  // if we have reached the end of the row (-2 because colNo is 0 indexed but noOptionValueCols is not)
							process.stdout.write('\n');
							colNo = 0;
						} else {
							colNo++;
						}
					}
				}

				process.stdout.write('\n\n');
			}
		}

		if (item.comment !== false) {
			process.stdout.write('COMMENT:\n'+item.comment);
			if (location[0] == 'itemComment') {
				process.stdout.write(t.CURSOR_CHAR);
			}
		}

		break;

	case 'finish':
		process.stdout.write('Finish Order\n\n');  // title

		process.stdout.write('Name: '+order.name);  // name input
		if (location[1] == 'name') process.stdout.write(t.CURSOR_CHAR);  // if currently editing the name
		process.stdout.write('\n\n');

		process.stdout.write('Payment:');
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
		process.stdout.write('x'+order.items[i].quantity+' '+menu[order.items[i].code].name+' $'+order.items[i].price.toFixed(2)+t.RESET);  // print NAME xQUANTITY $PRICE

		for (let j = 0; j < order.items[i].options.length; j++) {
			if (order.items[i].options[j]) {
				if (menu[order.items[i].code].options[j].type == 'toggle') {
					for (let k = 0; k < order.items[i].options[j].length; k++) {
						lineNo++;
						t.CURSOR_TO(lineNo, process.stdout.columns-config.orderWidth);  // position cursor
						process.stdout.write(t.DIM+' '+menu[order.items[i].code].options[j].values[order.items[i].options[j][k]].name+t.RESET);
					}
				} else {
					lineNo++;
					t.CURSOR_TO(lineNo, process.stdout.columns-config.orderWidth);  // position cursor
					process.stdout.write(t.DIM+' '+menu[order.items[i].code].options[j].values[order.items[i].options[j]].name+t.RESET);
				}
			}
		}
		if (order.items[i].comment) {  // if the item has a comment
			lineNo++;
			t.CURSOR_TO(lineNo, process.stdout.columns-config.orderWidth);  // position cursor
			process.stdout.write(t.DIM+' '+order.items[i].comment+t.RESET);
		}

		lineNo += 2;
	}

	// order comment
	if (order.comment !== false) {
		t.CURSOR_TO(lineNo, process.stdout.columns-config.orderWidth);  // position cursor
		process.stdout.write('COMMENT');
		lineNo++;
		t.CURSOR_TO(lineNo, process.stdout.columns-config.orderWidth);  // position cursor
		process.stdout.write(t.DIM+' '+order.comment);
		if (location[0] == 'orderComment') {
			process.stdout.write(t.CURSOR_CHAR);
		}
		process.stdout.write(t.RESET);

		lineNo += 2;
	}

	// total price
	t.CURSOR_TO(process.stdout.rows, process.stdout.columns-config.orderWidth);  // position at the bottom of the order
	process.stdout.write('Price: $'+order.price.toFixed(2));


	// errors
	t.CURSOR_TO(process.stdout.rows,0);
	process.stdout.write(t.FG_RED);  // move to bottom left and set to red
	for (let i = 0; i < err.length; i++) {
		process.stdout.write(t.ERASE_LN+err[i]);
		t.CURSOR_TO(process.stdout.rows-i, 0);// erase line, print message, and move up 1
	}
	process.stdout.write(t.RESET);
}
