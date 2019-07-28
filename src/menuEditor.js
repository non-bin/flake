// load config
const fs     = require('fs');
var   config = JSON.parse(fs.readFileSync('./flake.json', 'utf8'));  // read and parse the config file

const itemTemplate = {
	"code": "",
	"type": "item",
	"name": "",
	"price": 0,
	"options": []
};
const optionTemplate = {
	"type": "",
	"name": "",
	"selected": "",
	"values": {}
};
const optionValueTemplate = {
	"code": "",
	"name": "",
	"price": 0
};

var item        = clone(itemTemplate);
var option      = clone(optionTemplate);
var optionValue = clone(optionValueTemplate);

var location = ['name'];

process.stdout.write('New Item\nName: ');

process.stdin.setEncoding();  // get input in a usefull format
process.stdin.on('data', function(string) {
	string = string.trim();  // trim whitespace

	if (location[0] == 'name') {
		item      = clone(itemTemplate);
		item.name = string;
		location[0]  = 'code';
		process.stdout.write('Code: ');
	} else if (location[0] == 'code') {
		item.code = string;
		location[0]  = 'price';
		process.stdout.write('Price: $');
	} else if (location[0] == 'price') {
		item.price = Number(string);
		location   = ['options', 'confirm'];
		process.stdout.write('Add an option? (y/n): ');
	} else if (location[0] == 'options') {
		if (location[1] == 'confirm') {
			if (string == 'y') {
				location[1]  = 'name';
				process.stdout.write('Name: ');
			} else if (string == 'n') {
				config.menu[item.code]         = {};            // save the item
				config.menu[item.code].name    = item.name;
				config.menu[item.code].type    = item.type;
				config.menu[item.code].price   = item.price;
				config.menu[item.code].options = item.options;

				fs.writeFile('./flake.json', JSON.stringify(config), function(){});  // write the updated config

				item        = clone(itemTemplate);
				option      = clone(optionTemplate);
				optionValue = clone(optionValueTemplate);

				location = ['name'];
				process.stdout.write('Item Added\nNew Item\nName: ');
			} else {
				process.stdout.write('Add an option? (y/n): ');
			}
		} else if (location[1] == 'name') {
			option = clone(optionTemplate);
			option.name = string;
			location[1]  = 'type';
			process.stdout.write('Type (radio/toggle): ');
		} else if (location[1] == 'type') {
			if (['radio','toggle'].includes(string)) {
				option.type = string;
				location[1]  = 'selected';
				process.stdout.write('Selected: ');
			} else {
				process.stdout.write('Type (radio/toggle): ');
			}
		} else if (location[1] == 'selected') {
			option.selected = string;
			location[1] = 'value';
			location[2] = 'name';
			process.stdout.write('New option value\nName: ');
		} else if (location[1] == 'value') {
			if (location[2] == 'confirm') {
				if (string == 'y') {
					location[2]  = 'name';
					process.stdout.write('Name: ');
				} else if (string == 'n') {
					item.options.push(option);

					location = ['options', 'confirm'];
					process.stdout.write('Add another option? (y/n): ');
				}
			} else if (location[2] == 'name') {
				optionValue      = clone(optionValueTemplate);
				optionValue.name = string;

				location[2] = 'code';
				process.stdout.write('Code: ');
			} else if (location[2] == 'code') {
				optionValue.code = string;

				location[2] = 'price';
				process.stdout.write('Price: $');
			} else if (location[2] == 'price') {
				optionValue.price = Number(string);

				option.values[optionValue.code]       = {};
				option.values[optionValue.code].name  = optionValue.name;
				option.values[optionValue.code].price = optionValue.price;

				location[2] = 'confirm';
				process.stdout.write('Add another value? (y/n): ');
			}
		}
	}
});


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
