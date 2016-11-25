#Homebridge RFCom
Homebridge plugin for [RfCom](https://github.com/evinyatar/rfcom).

##Usage

Setup an Arduino with RfCom and configure it (see RfCom manual). Devices configured in RfCom are automatically added to
the platform.

```
  "platforms": [
    {
      "platform": "RfComPlatform",
      "name": "RfCom",
      "port": "/dev/ttyACM0"
    }
    ...
  ]
```
##Setting up devices

To add a device, you have to make a serial connection to the Arduino. You can use Arduino Studio for this, but make sure
Homebridge isn't running. Use `list_devices` to find a device ID that's not in use yet, or `initialize` if this is a first
time setup. Then follow the instructions for the protocol of choice below. 

###Chacon DIO
To add a Chacon DIO device, pick a switch id (0 to 15) and a sender id (0 to 67108863). Then enter
`add_device <id> 1 <switch>,<sender>`. Unplug the DIO outlet, and plug it back in. The LED should start flashing. Before
the LED stops flashing, enter `send <id> on`. The outlet should respond by briefly turning on and back off. You can 
unpair the outlet the same way by sending `off` instead of `on`. After this, when restarting Homebridge the device should
appear in Homekit.

###Somfy
To add a Somfy device, pick an address between 0 and 16777216, and a rolling code (100 is fine). Then enter
`add_device <id> 2 <address>,<rollingcode>` (substituting the values between < >). Take your original Somfy remote
and hold down the PROG button (if you can't find it, it's the small hole on the back of the remote) until the
blinds briefly go down and back up. Enter "send <id> prog". If the programming is successful, the blinds will respond
by going briefly down and back up again. You can test it be entering "send <id> down" or "send <id> up".

In the basic setup, the Homebridge plugin will only allow you to go fully up, fully down or to the preset halfway point.
If you want more control, you need to add some additional configuration in the Homebridge config.json. You'll need to
measure the time it takes for the blinds to go from fully up to fully down, and also the other way around (the blinds
will be slower going up that going down). In the platform section, adjust the config like so:

```
    {
      "platform": "RfComPlatform",
      "name": "RfCom",
      "port": "/dev/ttyACM0",
      "extra_config": {
        "<id>": {
          "timeUpToDown": 52.15,
          "timeDownToUp": 58.65
        }
      }
    }
```

Again, remember to substitute <id> for the actual device id you've assigned. Once this is setup, you can choose the
percentage of window covering in Homekit, and the plugin will automatically determine when to issue a stop command if
necessary. It relies on knowing the state of the blinds, so you can't use the original Somfy remote manually because
then it will get out of sync. If it does get out of sync, fully lowering or raising the blinds should be sufficient to
reset the sync. When starting Homebridge, the position is assumed to be fully up. If that should not be the case, you
can use the same method to resync.