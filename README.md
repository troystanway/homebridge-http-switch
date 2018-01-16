# homebridge-http-switch

A switch plugin for homebridge (https://github.com/nfarina/homebridge) which integrates with HTTP(S) APIs.

# Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin: `npm install -g git+https://git@github.com/vectronic/homebridge-http-switch.git`
3. Update your `config.json` configuration file

# Configuration

The name of the switch is specified by `name` (default `HTTP Switch`)

The switch is turned on by a request to the URL specified by `onUrl` and it is turned off by a request to `offUrl`.

Optional body content for these requests can be specified with `onBody` and `offBody`.

The HTTP method to use for on and off requests can be specified via `httpMethod` (default `GET`)

Switch status checking mode is specified via `checkStatus`:
 
 * `yes` for getting status on app load
 * `polling` for constant polling of status
 * `no` for no status checking (default)

If `polling` is specified, then `pollingInterval` can be used to specify the polling interval in milliseconds (default `10000`).

If `polling` or `yes` is specified, then `statusUrl` should be a URL which returns the status of the switch in the response body as an integer (0 = off, 1 = on). This URL is called using HTTP GET.

For more complex status responses, `statusRegex` defines a regular expression string that is used to determine if the response from a `statusUrl` request is true or false.

For example if `statusUrl` returns `PowerState:true` when the status is on and `PowerState:false` when the status is off then specify: 

```
    "statusRegex": "PowerState:true"
```

Configuration sample:

 ```
"accessories": [ 
	{
		"accessory": "http-switch",
		"name": "Lamp",
		"checkStatus": "polling",
		"pollingInterval": 10000,
		"statusUrl":  "http://localhost/status/100059",
		"statusRegex": "^.*off.: false.*$"
		"onUrl":      "http://localhost/controller/1700/ON",
		"offUrl":     "http://localhost/controller/1700/OFF",
		"httpMethod": "GET",
   } 
]
```    