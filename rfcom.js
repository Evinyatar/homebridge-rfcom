"use strict";

var SerialPort = require("serialport");

class RfCom {
    constructor(path) {
        this.path = path;
        this.hold = false;
        this.queue = [];
        this.buffer = "";
    }

    open() {
        return new Promise((resolve, reject) => {
            var self = this;
            var port = new SerialPort(this.path, {
                baud: 115200
            });

            this.port = port;

            port.on("open", (err) => {
                if(err) {
                    console.log("Error opening", err.message);
                    return;
                }
                this.command("json").then(() => resolve());
            });

            port.on('error', function(err) {
                console.log('Error: ', err.message);
            });

            port.on("data", (data) => {
                this.buffer += data.toString();
                let idx;
                while((idx = this.buffer.indexOf("\n")) > -1) {
                    let result = this.buffer.substr(0, idx);
                    this.buffer = this.buffer.substr(idx + 1);
                    this._handle(result);
                }
            });
        });
    }

    command(cmd) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                cmd: cmd,
                resolve: resolve,
                reject: reject
            });

            if(!this.hold) {
                this.hold = true;
                this._sendNext();
            }
        });
    }

    _sendNext() {
        var next = this.queue[0].cmd;
        console.log("Writing next command " + next);
        this.port.write(next + "\n", (err) => {
            if(err) {
                console.log(err);
            }
        });
        this.hold = true;
    }

    _handle(line) {
        let cmd = this.queue.shift();
        console.log("Received " + line + " in response to " + cmd.cmd);
        if(this.queue.length == 0) {
            this.hold = false;
        } else {
            this._sendNext();
        }

        let data = JSON.parse(line);

        if(data.success === false) {
            cmd.reject(data);
        } else {
            cmd.resolve(data);
        }
    }

    send(id, command) {
        return this.command(`send ${id} ${command}`);
    }

    listDevices() {
        return this.command('list_devices');
    }
}

module.exports = RfCom;