// homebridge-http-extensive
//
// This plugin was originally based on the homebridge-http-advanced plugin.
// It was then significantly modified to allow for covering more potential http scenarios.

var Service, Characteristic;
var request = require("request");
var pollingtoevent = require('polling-to-event');

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-http-extensive", "Http-extensive", HttpExtensiveAccessory);
};


function HttpExtensiveAccessory(log, config) {
    this.log = log;

    // General info
    this.name = config["name"];
    this.service = config["service"] || "Switch";

    // Authentication info
    this.username = config["username"] || "";
    this.password = config["password"] || "";
    this.sendimmediately = config["sendimmediately"] || "";

    // Get state (switches, lights, doors, locks, motion)
    this.get_state_url = config["get_state_url"];
    this.get_state_on_regex = config["get_state_on_regex"] || "1";
    this.get_state_off_regex = config["get_state_off_regex"] || "0";
    this.get_state_handling = config["get_state_handling"] || "onrequest";

    // Set state (switches, lights, doors, locks)
    this.set_state_url = config["set_state_url"];
    this.set_state_method = config["set_state_method"] || "POST";
    this.set_state_on = config["set_state_on"] || "1";
    this.set_state_off = config["set_state_off"] || "0";
    this.set_state_body = config["set_state_body"] || "{0}";

    // Get target (doors, locks)
    this.get_target_url = config["get_target_url"] || "";
    this.get_target_on_regex = config["get_target_on_regex"] || this.get_state_on_regex;
    this.get_target_off_regex = config["get_target_off_regex"] || this.get_state_off_regex;
    this.get_target_handling = config["get_target_handling"] || "onrequest";

    // Set target (doors, locks)
    this.set_target_url = config["set_target_url"] || "";
    this.set_target_method = config["set_target_method"] || this.set_state_method;
    this.set_target_on = config["set_target_on"] || this.set_state_on;
    this.set_target_off = config["set_target_off"] || this.set_state_off;
    this.set_target_body = config["set_target_body"] || this.set_state_body;

    // Get levels (dimmable lights)
    this.get_level_url = config["get_level_url"] || "";
    this.get_level_regex = config["get_level_regex"] || "\\d+";
    this.get_level_handling = config["get_level_handling"] || "onrequest";

    // Set levels (dimmable lights)
    this.set_level_url = config["set_level_url"] || "";
    this.set_level_method = config["set_level_method"] || this.set_state_method;
    this.set_level_body = config["set_level_body"] || "{0}";

    // Initialize our state to false
    this.state = false;
    // Initialize our level to 0
    this.currentlevel = 0;
    // Save off this as that
    var that = this;

    // Sensors will only work with continuous monitoring
    if (this.service === "SmokeSensor" || this.service === "MotionSensor") {
        this.get_state_handling = "continuous";
    }

    // Status Polling
    if ((this.get_state_url && this.get_state_handling === "continuous")) {
        var stateUrl = this.get_state_url;
        var statusemitter = pollingtoevent(function(done) {
            that.httpRequest(stateUrl, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, body) {
                if (error) {
                    that.log('HTTP get state failed: %s', error.message);
                } else {
                    done(null, body);
                }
            });
        }, {
            longpolling: true,
            interval: 300,
            longpollEventName: "statuspoll"
        });

        statusemitter.on("statuspoll", function(data) {
            var reOn = new RegExp(that.get_state_on_regex);
            var reOff = new RegExp(that.get_state_off_regex);
            var foundOn = reOn.test(data);
            var foundOff = reOff.test(data);

            if (foundOn || foundOff) {
                // Is the previous state different than the new state?
                var previousState = that.state;

                // Found a state
                that.state = foundOn;

                if (that.state !== previousState) {
                    that.log(that.service, "received data:" + that.name, "state is currently", that.state.toString());
                }

                switch (that.service) {
                    case "Switch":
                        if (that.switchService) {
                            that.switchService.getCharacteristic(Characteristic.On)
                                .setValue(that.state);
                        }
                        break;
                    case "Lightbulb":
                        if (that.lightbulbService) {
                            that.lightbulbService.getCharacteristic(Characteristic.On)
                                .setValue(that.state);
                        }
                        break;
                    case "SmokeSensor":
                        if (that.smokeService) {
                            that.smokeService.getCharacteristic(Characteristic.SmokeDetected)
                                .setValue(that.state);
                        }
                        break;
                    case "MotionSensor":
                        if (that.motionService) {
                            that.motionService.getCharacteristic(Characteristic.MotionDetected)
                                .setValue(that.state);
                        }
                        break;
                    case "LockMechanism":
                        if (that.lockService) {
                            var lockValue = that.state ? Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED;

                            that.lockService.getCharacteristic(Characteristic.LockCurrentState)
                                .setValue(lockValue);
                        }
                        break;
                }
            } else {
                that.log(that.service, "get_state_url did not return a valid state");
            }
        });
    }

    // target Polling
    if ((this.get_target_url && this.get_target_handling === "continuous")) {
        var targetUrl = this.get_target_url;
        var previousTarget = false;
        var targetemitter = pollingtoevent(function(done) {
            that.httpRequest(targetUrl, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, body) {
                if (error) {
                    that.log('HTTP get target failed: %s', error.message);
                } else {
                    done(null, body);
                }
            });
        }, {
            longpolling: true,
            interval: 300,
            longpollEventName: "targetpoll"
        });

        targetemitter.on("targetpoll", function(data) {
            var reOn = new RegExp(that.get_target_on_regex);
            var reOff = new RegExp(that.get_target_off_regex);
            var foundOn = reOn.test(data);
            var foundOff = reOff.test(data);

            if (foundOn || foundOff) {
                // Is the previous state different than the new state?
                var target = foundOn;

                if (target !== previousTarget) {
                    that.log(that.service, "received data:" + that.name, "target is currently", target.toString());
                    previousTarget = target;
                }

                switch (that.service) {
                    case "LockMechanism":
                        if (that.lockService) {
                            var lockValue = target ? Characteristic.LockTargetState.SECURED : Characteristic.LockTargetState.UNSECURED;

                            that.lockService.getCharacteristic(Characteristic.LockTargetState)
                                .setValue(lockValue);
                        }
                        break;
                }
            } else {
                that.log(that.service, "get_target_url did not return a valid state");
            }
        });
    }


    // Level Polling
    if (this.get_level_url && this.get_level_handling === "continuous") {
        var levelurl = this.get_level_url;
        var levelemitter = pollingtoevent(function(done) {
            that.httpRequest(levelurl, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, responseBody) {
                if (error) {
                    that.log('HTTP get level failed: %s', error.message);
                    return;
                } else {
                    done(null, responseBody);
                }
            });
        }, {
            longpolling: true,
            interval: 2000,
            longpollEventName: "levelpoll"
        });

        levelemitter.on("levelpoll", function(data) {
            var re = new RegExp(that.get_level_regex);
            var matches = re.match(data);

            if (matches) {
                that.currentlevel = matches[0];

                if (that.lightbulbService) {
                    that.log(that.service, "received data:" + that.get_level_url, "level is currently", that.currentlevel);
                    that.lightbulbService.getCharacteristic(Characteristic.Brightness)
                        .setValue(that.currentlevel);
                }
            } else {
                that.log(that.service, "get_level_url did not return a response that matched get_level_regex");
            }
        });
    }
}

HttpExtensiveAccessory.prototype = {
    format: function(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] !== 'undefined' ?
                args[number] :
                match;
        });
    },
    httpRequest: function(url, body, method, username, password, sendimmediately, callback) {
        request({
                url: url,
                body: body,
                method: method,
                rejectUnauthorized: false,
                auth: {
                    user: username,
                    pass: password,
                    sendImmediately: sendimmediately
                }
            },
            // error, response, body
            callback);
    },
    getGenericState: function(type, url, regexOn, regexOff, callback) {
        if (!url) {
            this.log.warn("Ignoring request; No " + type + " url defined.");
            callback(new Error("No " + type + " url defined."));
            return;
        }

        var service = this.service;
        this.log("Getting", service, "state");

        this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
            if (error) {
                this.log('HTTP get %s state failed: %s', type, error.message);
                callback(error);
            } else {
                var reOn = new RegExp(regexOn);
                var reOff = new RegExp(regexOff);
                var foundOn = reOn.test(responseBody);
                var foundOff = reOff.test(responseBody);

                if (foundOn || foundOff) {
                    var state = foundOn;
                    this.log(service, type + " state is currently", state.toString());
                    callback(null, state);
                } else {
                    this.log('HTTP get %s did not return a valid state', type);
                    callback(new Error('No valid state returned for ' + type));
                }
            }
        }.bind(this));
    },
    getStatusState: function(callback) {
        this.getGenericState("status", this.get_state_url, this.get_state_on_regex, this.get_state_off_regex, callback);
    },
    setGenericState: function(type, url, method, body, onStr, offStr, value, callback) {
        if (!url) {
            this.log.warn("Ignoring request; No " + type + " url defined.");
            callback(new Error("No " + type + " url defined."));
            return;
        }

        var valueStr = value ? onStr : offStr;
        this.log('Setting %s state to %s', type, value);
        var completeUrl = this.format(url, valueStr);
        var completeBody = this.format(body, valueStr);

        this.httpRequest(completeUrl, completeBody, method, this.username, this.password, this.sendimmediately, function(error, response) {
            if (error) {
                this.log('HTTP set %s function failed: %s', type, error.message);
                callback(error);
            } else {
                if (response.statusCode === 200) {
                    this.log('HTTP set %s function succeeded!', type);
                    callback();
                } else {
                    this.log('set %s returned statusCode: %s', type, response.statusCode);
                    callback(new(Error("set " + type + " returned statusCode: " + response.statusCode)));
                }
            }
        }.bind(this));

    },
    setPowerState: function(powerOn, callback) {
        this.setGenericState("set_state_url", this.set_state_url, this.set_state_method, this.set_state_body, this.set_state_on, this.set_state_off, powerOn, callback);
    },

    getLockCurrentState: function(callback) {
        this.getGenericState("get_state_url", this.get_state_url, this.get_state_on_regex, this.get_state_off_regex, callback);
    },
    setLockCurrentState: function(value, callback) {
        this.setGenericState("set_state_url", this.set_state_url, this.set_state_method, this.set_state_body, this.set_state_on, this.set_state_off, value, callback);
    },
    getLockTargetState: function(callback) {
        this.getGenericState("get_target_url", this.get_target_url, this.get_target_on_regex, this.get_target_off_regex, callback);
    },

    setLockTargetState: function(value, callback) {
        this.setGenericState("set_target_url", this.set_target_url, this.set_target_method, this.set_target_body, this.set_target_on, this.set_target_off, value, callback);
    },


    getLevel: function(callback) {
        if (!this.get_level_url) {
            this.log.warn("Ignoring request; No get_level_url defined.");
            callback(new Error("No get_level_url defined."));
            return;
        }
        var url = this.get_level_url;
        var re = new RegExp(this.get_level_regex);
        this.log("Getting level");

        this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
            if (error) {
                this.log('HTTP get brightness function failed: %s', error.message);
                callback(error);
            } else {
                var matches = re.match(responseBody);
                if (matches) {
                    // Get the first match
                    var level = matches[0];
                    this.log("The level is currently %s", level);
                    callback(null, level);
                } else {
                    this.log('get_level_url failed to return a response that matched the regular expression in get_level_regex');
                    callback(new Error('get_level_url failed to return a valid response'));
                }
            }
        }.bind(this));
    },

    setLevel: function(level, callback) {
        if (!this.set_level_url) {
            this.log.warn("Ignoring request; No set_level_url defined.");
            callback(new Error("No set_level_url defined."));
            return;
        }

        var completeUrl = this.format(this.set_level_url, level);
        var completeBody = this.format(this.set_level_body, level);

        this.log("Setting level to %s", level);

        this.httpRequest(completeUrl, completeBody, this.set_level_method, this.username, this.password, this.sendimmediately, function(error, response) {
            if (error) {
                this.log('HTTP set_level_url function failed: %s', error);
                callback(error);
            } else {
                if (response.statusCode === 200) {
                    this.log('HTTP set_level_url function succeeded!');
                    callback();
                } else {
                    this.log("HTTP set_level_url failed with response code: %s", response.statusCode);
                    callback(new Error("set_level_url returned code: " + response.statusCode));
                }
            }
        }.bind(this));
    },

    identify: function(callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function() {
        var that = this;

        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "HTTP Manufacturer")
            .setCharacteristic(Characteristic.Model, "HTTP Model")
            .setCharacteristic(Characteristic.SerialNumber, "HTTP Serial Number");

        switch (this.service) {
            case "Switch":
                this.switchService = new Service.Switch(this.name);
                switch (this.get_state_handling) {
                    case "onrequest":
                        this.switchService
                            .getCharacteristic(Characteristic.On)
                            .on('get', this.getStatusState.bind(this))
                            .on('set', this.setPowerState.bind(this));
                        break;
                    case "continuous":
                        this.switchService
                            .getCharacteristic(Characteristic.On)
                            .on('get', function(callback) {
                                callback(null, that.state);
                            })
                            .on('set', this.setPowerState.bind(this));
                        break;
                    default:
                        this.switchService
                            .getCharacteristic(Characteristic.On)
                            .on('set', this.setPowerState.bind(this));
                        break;
                }
                return [this.switchService];
            case "Lightbulb":
                this.lightbulbService = new Service.Lightbulb(this.name);
                switch (this.get_state_handling) {

                    case "onrequest":
                        this.lightbulbService
                            .getCharacteristic(Characteristic.On)
                            .on('get', this.getStatusState.bind(this))
                            .on('set', this.setPowerState.bind(this));
                        break;
                    case "continuous":
                        this.lightbulbService
                            .getCharacteristic(Characteristic.On)
                            .on('get', function(callback) {
                                callback(null, that.state);
                            })
                            .on('set', this.setPowerState.bind(this));
                        break;
                    default:
                        this.lightbulbService
                            .getCharacteristic(Characteristic.On)
                            .on('set', this.setPowerState.bind(this));
                        break;
                }

                if (this.get_level_handling === "continuous") {
                    this.lightbulbService
                        .addCharacteristic(new Characteristic.Brightness())
                        .on('get', function(callback) {
                            callback(null, that.currentlevel);
                        })
                        .on('set', this.setLevel.bind(this));
                } else if (this.get_level_handling === "onrequest") {
                    this.lightbulbService
                        .addCharacteristic(new Characteristic.Brightness())
                        .on('get', this.getLevel.bind(this))
                        .on('set', this.setLevel.bind(this));
                }

                return [informationService, this.lightbulbService];
            case "LockMechanism":
                var lockService = new Service.LockMechanism(this.name);

                if (this.set_state_url) {
                    // Only handle "set" if we have a set_state_url
                    lockService
                        .getCharacteristic(Characteristic.LockCurrentState)
                        .on('get', this.getLockCurrentState.bind(this))
                        .on('set', this.setLockCurrentState.bind(this));
                } else {
                    lockService
                        .getCharacteristic(Characteristic.LockCurrentState)
                        .on('get', this.getLockCurrentState.bind(this));
                }

                if (this.get_target_url) {
                    // Only handle target if we have a get_target_url
                    if (this.set_target_url) {
                        // Only handle "set" if we have a set_target_url
                        lockService
                            .getCharacteristic(Characteristic.LockTargetState)
                            .on('get', this.getLockTargetState.bind(this))
                            .on('set', this.setLockTargetState.bind(this));
                    } else {
                        lockService
                            .getCharacteristic(Characteristic.LockTargetState)
                            .on('get', this.getLockTargetState.bind(this));
                    }
                }

                return [lockService];
            case "SmokeSensor":
                this.smokeService = new Service.SmokeSensor(this.name);
                this.get_state_handling = "continuous";

                this.smokeService
                    .getCharacteristic(Characteristic.SmokeDetected)
                    .on('get', function(callback) {
                        callback(null, that.state);
                    });

                return [this.smokeService];
            case "MotionSensor":
                this.motionService = new Service.MotionSensor(this.name);
                this.get_state_handling = "continuous";
                this.motionService
                    .getCharacteristic(Characteristic.MotionDetected)
                    .on('get', function(callback) {
                        callback(null, that.state);
                    });

                return [this.motionService];
        }
    }
};
