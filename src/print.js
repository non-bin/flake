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
p.FNT_0 = p.ESC+'M\u0000';  // font
p.FNT_1 = p.ESC+'M\u0001';
p.LG    = p.ESC+'!\u0020';  // double width
p.DONE  = p.ESC+'d\u0005';  // print 6 new lines to give enough space to rip

function receptInit(path) {
	var printer = {};
	printer.path = path;
	printer.print = function(data) {
		fs.writeFile(path, data, function(err) {
			if (err) console.error(err + '\n data: "'+data+'"');
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
	var x        = receptInit('/dev/usb/lp1');

	switch (type) {
		case 'ticket':
			// date, time, and name
			const date = new Date(content.date);
			printStr += p.RESET+date.toLocaleString(undefined, {day: 'numeric', month: 'numeric', year: '2-digit', hour: 'numeric', minute: 'numeric'})+' '+p.BLD+content.name+'\n\n';

			// price
			if (options.printPrice) {
				printStr += p.RESET+'$'+content.price.toFixed(2)+'\n\n';
			}

			// order content
			for (let i = 0; i < content.items.length; i++) {
				printStr += p.RESET+p.LG+p.BLD + content.items[i].quantity+' '+menu[content.items[i].code].name + '\n';  // print NAME xQUANTITY $PRICE

				for (let j = 0; j < content.items[i].options.length; j++) {
					if (content.items[i].options[j]) {
						printStr += p.RESET+p.LG+' ' + menu[content.items[i].code].options[j].values[content.items[i].options[j]].name + '\n';
					}
				}
				if (content.items[i].comment) {  // if the item has a comment
					printStr += p.RESET+p.LG+' ' + content.items[i].comment + '\n';
				}
				printStr += '\n\n'
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
