"use strict";

var AbstractHandler = require('../handler');

function getTime() {
    return new Date().getTime();
}

/**
 * There are two modes for Somfy control; basic and advanced.
 * - Basic: make the blinds go up by increasing the value, down by decreasing the value,...
 * - Advanced: set the percentage of covering you'd like and the plugin will stop the blinds for you. This requires
 *      some timing information to be set in the configuration.
 */
class SomfyHandler extends AbstractHandler {
    constructor(platform, device, extraConfig) {
        super(platform, device, extraConfig);

        // assume covering is fully open and stopped at startup
        this.state = 0;
        this.lastPosition = 100;
        this.advancedControl = extraConfig !== undefined && extraConfig.timeUpToDown !== undefined && extraConfig.timeDownToUp !== undefined;
    }

    get displayName() {
        return "Chacon DIO - " + this.device.id;
    }

    initAccessory(accessory) {
        accessory.addService(this.Service.WindowCovering);
    }

    setPositionState(state) {
        this.accessory.getService(this.Service.WindowCovering).getCharacteristic(this.Characteristic.PositionState).setValue(state);
    }

    moveUp() {
        if(this.state == -1) {
            this.stop();
        } else if(this.state == 1) {
            return; // already going up
        }
        console.log("Move Up");
        this.send("up");
        this.setPositionState(this.Characteristic.PositionState.INCREASING);
        this.timestamp = getTime()
        this.positionAtMotionStart = this.currentActualPosition;
        this.state = 1;
    }

    moveDown() {
        if(this.state == 1) {
            this.stop();
        } else if(this.state == -1) {
            return; //already going down
        }
        console.log("Move Down");
        this.send("down");
        this.setPositionState(this.Characteristic.PositionState.DECREASING);
        this.timestamp = getTime()
        this.positionAtMotionStart = this.currentActualPosition;
        this.state = -1;
    }

    stop(assumeStopped) {
        if(this.state == 0) {
            // going to preferred halfway
        } else {
            this.setPositionState(this.Characteristic.PositionState.STOPPED);
            this.accessory.getService(this.Service.WindowCovering).getCharacteristic(this.Characteristic.CurrentPosition).setValue(this.currentActualPosition);
            this.lastPosition = this.currentActualPosition;
            this.state = 0;
            if(!assumeStopped) {
                console.log("Stopped at " + this.lastPosition);
                this.send("stop");
            } else {
                console.log("Assuming stopped at " + this.lastPosition);
            }
        }
    }

    goToActualPosition(value) {
        let current = this.currentActualPosition;

        if (this.targetActualPosition == value) {
            console.log("Target position already at " + value);
            return;
        }

        console.log("Setting to " + value + " from " + current);

        if (this.stopTimer) {
            clearTimeout(this.stopTimer);
        }
        let timeout = undefined;
        if (value > current) {
            this.moveUp();
            timeout = this.extraConfig.timeDownToUp * (value - current);
        } else if (value < current) {
            this.moveDown();
            timeout = this.extraConfig.timeUpToDown * (current - value);
        } else {
            this.stop();
        }

        if (timeout !== undefined) {
            console.log("Stop timer in " + (timeout / 100));
            this.stopTimer = setTimeout(() => {
                this.stopTimer = undefined;
                this.stop(value == 0 || value == 100);
            }, timeout * 10);
        }
    }

    get currentActualPosition() {
        if(this.state == 0) {
            return this.lastPosition;
        } else {
            let timestamp = getTime(),
                duration = (timestamp - this.timestamp) / 10,
                delta;
            if(this.state == -1) {
                delta = -1 * duration / this.extraConfig.timeUpToDown;
            } else {
                delta = duration / this.extraConfig.timeDownToUp;
            }
            console.log("Calculating: position was %s %s seconds ago, going %s, so should have changed by %s for %s", this.positionAtMotionStart, duration / 100, (this.state == -1 ? 'down' : 'up'), delta, this.positionAtMotionStart + delta);
            return Math.max(0, Math.min(100, this.positionAtMotionStart + delta));
        }
    }

    attach(accessory) {
        this.accessory = accessory;
        const service = accessory.getService(this.Service.WindowCovering);
        const currentPosition = service.getCharacteristic(this.Characteristic.CurrentPosition);
        const positionState = service.getCharacteristic(this.Characteristic.PositionState);
        const targetPosition = service.getCharacteristic(this.Characteristic.TargetPosition);

        if(this.advancedControl) {
            targetPosition.on('set', (targetValue, callback) => {
                try {
                    this.goToActualPosition(targetValue);
                    callback();
                } catch(error) {
                    console.log("Error setting position " + error);
                    callback(error);
                }
            });

            targetPosition.on('get', (callback) => {
                callback(null, this.targetActualPosition);
            });

            currentPosition.on('get', (callback) => {
                callback(null, this.currentActualPosition);
            });

            currentPosition.setValue(this.currentActualPosition);
            targetPosition.setValue(this.currentActualPosition);
            positionState.setValue(this.Characteristic.PositionState.STOPPED);

            positionState.on('get', (callback) => {
                if (this.state == 0) {
                    callback(null, this.Characteristic.PositionState.STOPPED);
                } else if (this.state == -1) {
                    callback(null, this.Characteristic.PositionState.DECREASING);
                } else {
                    callback(null, this.Characteristic.PositionState.INCREASING);
                }
            });
        } else {
            targetPosition.on('set', (targetValue, callback) => {
                currentPosition.getValue((error, currentValue) => {
                    if(error) {
                        console.log(error);
                        callback(error);
                        return;
                    }

                    if(targetValue < currentValue) {
                        positionState.setValue(this.Characteristic.PositionState.DECREASING);
                    } else if(targetValue > currentValue) {
                        positionState.setValue(this.Characteristic.PositionState.INCREASING);
                    } else {
                        positionState.setValue(this.Characteristic.PositionState.STOPPED);
                    }

                    callback();

                    let promise;
                    if(targetValue == 100) {
                        promise = this.send('up');
                    } else if(targetValue == 0) {
                        promise = this.send('down');
                    } else {
                        promise = this.send('my');
                    }

                    promise.then(() => {
                        positionState.setValue(this.Characteristic.PositionState.STOPPED);
                    });
                });
            });
        }

        return service;
    }
}

SomfyHandler.protocolId = "Somfy";

module.exports = SomfyHandler;