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

    class ChaconDioHandler {
        constructor(device) {
            this.device = device;
        }

        get displayName() {
            return "Chacon DIO - " + this.device.id;
        }

        initAccessory(accessory) {
            accessory.addService(Service.Switch);
        }

        attach(accessory) {
            accessory.getService(Service.Switch).getCharacteristic(Characteristic.On).on("set", (value, callback) => {
                rfComDevice.send(this.device.id, value ? "on" : "off");
                callback();
            });
        }
    }

    class SomfyHandler {
        constructor(device) {
            this.device = device;
        }

        get displayName() {
            return "Chacon DIO - " + this.device.id;
        }

        initAccessory(accessory) {
            accessory.addService(Service.WindowCovering);
        }

        attach(accessory) {
            const orientation = {
                closed: 'down',
                middle: 'stop',
                opened: 'up'
            };

            const service = accessory.getService(Service.WindowCovering);

            const currentPosition =
                service.getCharacteristic(Characteristic.CurrentPosition);
            const positionState =
                service.getCharacteristic(Characteristic.PositionState);
            const targetPosition =
                service.getCharacteristic(Characteristic.TargetPosition);

            targetPosition.on('set', (targetValue, callback) => {
                const logError = error => {
                    this.log(
                        'Encountered an error setting target position of %s: %s',
                        `channel ${channelNumber} (${name})`,
                        error.message
                    );
                };

                currentPosition.getValue((error, currentValue) => {
                    if (error) {
                        logError(error);
                        callback(error);
                        return;
                    }

                    console.log(
                        'Setting target position of %s from %s to %s.',
                        `${currentValue}%`,
                        `${targetValue}%`
                    );
                    positionState.setValue(
                        targetValue < currentValue
                            ? Characteristic.PositionState.DECREASING
                            : targetValue > currentValue
                            ? Characteristic.PositionState.INCREASING
                            : Characteristic.PositionState.STOPPED
                    );
                    callback();

                    const cmd =
                        targetValue === 0
                            ? orientation.closed
                            : targetValue === 100
                            ? orientation.opened
                            : orientation.middle;

                    console.log("Sending", cmd);
                    let promise = rfComDevice.send(this.device.id, cmd);
                    // let promise = Promise.resolve();

                    promise.then(
                        () => {
                            currentPosition.setValue(targetValue);
                            positionState.setValue(Characteristic.PositionState.STOPPED);
                        },
                        logError
                    );
                });
            });

            // Set a more sane default value for the current position.
            currentPosition.setValue(currentPosition.getDefaultValue());

            return service;
        }
    }

    var handlers = {
        "Chacon Dio": ChaconDioHandler,
        "Somfy": SomfyHandler
    };

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
                    rfComDevice.open().then(() => {
                        rfComDevice.listDevices().then(deviceList => {
                            deviceList.forEach(device => {
                                console.log("Device detected", device);
                                if(!(device.id in this.accessories)) {
                                    if(device.protocol in handlers) {
                                        var handler = new handlers[device.protocol](device);
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
            let handler = new handlers[classId](accessory.context.device);
            handler.attach(accessory);
            this.accessories[device.id] = handler;
            accessory.updateReachability(true);
        }
    }

    // For platform plugin to be considered as dynamic platform plugin,
    // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
    homebridge.registerPlatform("homebridge-rfcom", "RfComPlatform", RfComPlatform, true);
};
