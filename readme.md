Homebridge RFCom
================

Homebridge plugin for [RfCom](https://github.com/evinyatar/rfcom).

Usage
-----
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

Supported Protocols
-------------------
* Somfy
* Chacon Dio