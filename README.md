# homebridge-http-advanced

Supports https devices on the HomeBridge Platform and provides a real time polling for getting the "On" and brightness level characteristics to Homekit. Includes Switch, Light, Door, Smoke and Motion sensor polling.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin by cloning this repo.
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration

The configuration for this plugin is the same as [homebridge-http](https://github.com/rudders/homebridge-http) but includes an additional method to read the power state of the device and the brightness level. Specify the `status_url` in your config.json that returns the status of the device as an integer (0 = off, 1 = on). Specify the `brightnesslvl_url` to return the current brighness level as an integer.  Specify `status_regex` to specify a regular expression to match against the response from the status_url request.

Status regular expression matching (`status_regex`) defines a regular expression string that is used to determine if the response from a status_url request is true or false.  For instance, if your status_url returns "PowerState:true" when the status is on and "PowerState:false" when the status is off, in your configuration you could specify: `"status_regex": "PowerState:true"`.

Switch handling and brightness handling support 3 methods, yes for polling on app load, realtime for constant polling or no polling

Configuration sample:

 ```
"accessories": [ 
	{
		"accessory": "Http",
		"name": "Alfresco Lamp",
		"switchHandling": "realtime",
		"http_method": "GET",
		"on_url":      "http://localhost/controller/1700/ON",
		"off_url":     "http://localhost/controller/1700/OFF",
		"status_url":  "http://localhost/status/100059",
		"service": "Light",
		"brightnessHandling": "yes",
		"brightness_url":     "http://localhost/controller/1707/%b",
		"brightnesslvl_url":  "http://localhost/status/100054",
		"sendimmediately": "",
		"username" : "",
		"password" : ""					    
       } 
    ]