// Homebridge interface

"use strict";

var http = require('http');
var RfCom = require('./rfcom');
var PlatformAccessory, Service, Characteristic, UUIDGen;

var rfComDevice;

module.exports = function (homebridge) {
    console.log("homebridge API version: " + homebridge.version);

    // Accessory must be created from PlatformAccessory Constructor
    PlatformAccessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    var handlers = require('./protocols');

    // Platform constructor
    // config may be null
    // api may be null if launched from old homebridge version
    class RfComPlatform {
        constructor(log, config, api) {
            log("RfCom Initing");
            var platform = this;
            this.log = log;
            this.config = config;
            this.accessories = [];

            if (api) {
                // Save the API object as plugin needs to register new accessory via this object.
                this.api = api;

                // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories
                // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
                // Or start discover new accessories
                this.api.on('didFinishLaunching', () => {
                    platform.log("DidFinishLaunching");

                    rfComDevice = new RfCom(config.port);
                    this.rfComDevice = rfComDevice;

                    rfComDevice.open().then(() => {
                        rfComDevice.listDevices().then(deviceList => {
                            deviceList.forEach(device => {
                                console.log("Device detected", device);
                                if(!(device.id in this.accessories)) {
                                    if(device.protocol in handlers) {
                                        var handler = new handlers[device.protocol](this, device, config.extra_config[device.id]);
                                        let uuid = UUIDGen.generate(handler.displayName);

                                        let acc = new PlatformAccessory(handler.displayName, uuid);

                                        acc.context.device = device;

                                        acc.updateReachability(true);

                                        handler.initAccessory(acc);
                                        handler.attach(acc);

                                        this.accessories[device.id] = handler;
                                        api.registerPlatformAccessories("homebridge-rfcom", "RfComPlatform", [acc]);
                                        log("Accessory registered");
                                    }
                                }
                            });
                        });
                    });
                });
            }
        }

        configureAccessory(accessory) {
            this.log(accessory.displayName, "Configure Accessory");
            let device = accessory.context.device;
            let classId = device.protocol;
            let handler = new handlers[classId](this, accessory.context.device, this.config.extra_config[device.id]);
            handler.attach(accessory);
            this.accessories[device.id] = handler;
            accessory.updateReachability(true);
        }
    }

    // For platform plugin to be considered as dynamic platform plugin,
    // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
    homebridge.registerPlatform("homebridge-rfcom", "RfComPlatform", RfComPlatform, true);
};
