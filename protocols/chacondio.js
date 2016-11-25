"use strict";

var AbstractHandler = require('../handler');

class ChaconDioHandler extends AbstractHandler {
    constructor(api, device) {
        super(api, device);
    }

    get displayName() {
        return "Chacon DIO - " + this.device.id;
    }

    initAccessory(accessory) {
        accessory.addService(this.Service.Switch);
    }

    attach(accessory) {
        accessory.getService(this.Service.Switch).getCharacteristic(this.Characteristic.On).on("set", (value, callback) => {
            this.send(value ? "on" : "off");
            callback();
        });
    }
}

ChaconDioHandler.protocolId = 'Chacon Dio';

module.exports = ChaconDioHandler;