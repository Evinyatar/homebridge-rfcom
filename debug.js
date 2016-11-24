"use strict";
process.argv.splice(0,1);
console.log(process.argv);
let cli = require('/usr/lib/node_modules/homebridge/lib/cli');
cli();