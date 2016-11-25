"use strict";

class AbstractHandler {
    constructor(platform, device, extraConfig) {
        this.platform = platform;
        this.device = device;
        this.extraConfig = extraConfig;
    }

    send(cmd) {
        return this.platform.rfComDevice.send(this.device.id, cmd);
    }

    get Characteristic() {
        return this.platform.api.hap.Characteristic;
    }

    get Service() {
        return this.platform.api.hap.Service;
    }
}

module.exports = AbstractHandler;