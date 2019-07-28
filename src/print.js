const fs = require('fs');

// controll strings
const p = {};  // printer

p.NUL   = '\u0000';         // prefixes
p.LF    = '\u000A';
p.ESC   = '\u001B';
p.GS    = '\u001D';
p.RESET = p.ESC+'@';        // reset everything
p.JF_L  = p.ESC+'a\u0000';  // justify
p.JF_C  = p.ESC+'a\u0001';
p.JF_R  = p.ESC+'a\u0002';
p.BLD   = p.ESC+'E\u0001';  // bold
p.BLD_0 = p.ESC+'E\u0000';
p.FNT_0 = p.ESC+'M\u0000';  // font
p.FNT_1 = p.ESC+'M\u0001';
p.LG    = p.ESC+'!\u0020';  // double width
p.DONE  = '\n\n\n\n\n\n';  // print 6 new lines to give enough space to rip

module.exports.p = p;

module.exports.receptInit = function(path) {
	var printer = {};
	printer.path = path;
	printer.print = function(data) {
		fs.writeFile(path, data, function(err) {
			if (err) console.error(err);
		});
	}

	// printer.print(p.RESET);

	return printer;
}


/**
 * print a recept
 *
 * @param {String} type 'ticket' for kitchen, or 'customer' for the customer copy
 * @param {*} content the object containing the content of the recept
 */
module.exports.printRecept = function(type, content, location, submenu, config, order, err, menu, item, options = {printPrice: true}) {
	var printStr = '';
	var x        = module.exports.receptInit(config.printerPath);

	switch (type) {
		case 'ticket':
			printStr += p.RESET;

			// name and price
			if (content.name) {
				printStr += p.LG+p.BLD+content.name;  // name
			}
			if (content.name && options.printPrice) {  // name price separator
				printStr += p.BLD_0+' - ';
			}
			if (options.printPrice) {
				printStr += p.LG+'$'+content.price.toFixed(2);  // price
			}
			if (content.name || options.printPrice) {  // space
				printStr += '\n\n';
			}

			// date and time
			const date = new Date(content.date);
			printStr += p.RESET+date.toLocaleString(undefined, {day: 'numeric', month: 'short', year: '2-digit', hour: 'numeric', minute: 'numeric'})+'\n\n';

			// order content
			for (let i = 0; i < content.items.length; i++) {
				printStr += p.RESET+p.LG+p.BLD + content.items[i].quantity+'x '+menu[content.items[i].code].name + '\n';  // print NAME xQUANTITY $PRICE

				for (let j = 0; j < content.items[i].options.length; j++) {
					if (content.items[i].options[j] != '' && content.items[i].options[j] != []) {
						printStr += p.RESET+p.LG+' ' + menu[content.items[i].code].options[j].values[content.items[i].options[j]].name + '\n';
					}
				}
				if (content.items[i].comment) {  // if the item has a comment
					printStr += p.RESET+p.LG+' ' + content.items[i].comment + '\n';
				}
				printStr += '\n'
			}

			if (content.comment !== false) {
				printStr += p.RESET+p.LG+p.BLD+'COMMENT\n';
				printStr += p.RESET+p.LG+content.comment+'\n';
			}
			break;

		default:
			break;
	}

	x.print(printStr+p.DONE);
}
