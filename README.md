# homebridge-http-extensive

Supports https devices on the HomeBridge Platform and provides a real time polling for getting the "On" and brightness level characteristics to Homekit. Includes Switch, Light, Door, Smoke and Motion sensor polling.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin by cloning this repo.
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration


#Valid configuration fields:

##General info
name: The name of your accessory.  REQUIRED  
service: The type of your service. (Switch or Lightbulb or LockMechanism or SmokeSensor or MotionSensor).  DEFAULT: Switch  

##Authentication info
username: The username for authentication.  
password: The password for authentication.  
sendimmediately: Authentication data gets sent on the initial URL request as Basic auth vs waiting for auth negotiation.  DEFAULT: undefined  


## Get state (Switch, Lightbulb, LockMechanism, SmokeSensor, MotionSensor)
get_state_url: The URL that returns the state of the accessory. REQUIRED if get_state_handling is continuous or onrequest.  
get_state_on_regex: A regular expression that will match when the get_state_url body returns an on. DEFAULT: "1"  
get_state_off_regex: A regular expression that will match when the get_state_url body returns an off. DEFAULT: "0"  
get_state_handling: Whether state is queried at a continuous interval, only when requested, or disabled. (continuous, onrequest, disabled). DEFAULT: onrequest  

## Set state (Switch, Lightbulb, LockMechanism)
set_state_url: The URL that sets the state of the accessory.  
set_state_method: The http method that will be used when using the set_state_url. Place {0} in the string where you want the state to occur. DEFAULT: "POST"  
set_state_body: The http body that will be sent with the request.  Place {0} in the string where you what the state to occur.  DEFAULT: "{0}"  
set_state_on: The string that is used to replace {0} in the set_state_url or set_state_body when the state is on.  DEFAULT: "1"  
set_state_off: The string that is used to replace {0} in the set_state_url or set_state_body when the state is off.  DEFAULT: "0"  

## Get target (LockMechanism)
get_target_url: The URL that returns the target of the accessory. REQUIRED if get_target_handling is continuous or onrequest.  
get_target_on_regex: A regular expression that will match when the get_target_url body returns an on. DEFAULT: get_state_on_regex  
get_target_off_regex: A regular expression that will match when the get_target_url body returns an off. DEFAULT: get_state_off_regex  
get_target_handling: Whether target is queried at a continuous interval, only when requested, or disabled. (continuous, onrequest, disabled). DEFAULT: onrequest  

## Set target (LockMechanism)
set_target_url: The URL that sets the target of the accessory.  
set_target_method: The http method that will be used when using the set_target_url. Place {0} in the string where you want the target string to occur. DEFAULT: set_state_method  
set_target_on: The string that is used to replace {0} in the set_target_url or set_target_body when the target is on.  DEFAULT: set_state_on  
set_target_off: The string that is used to replace {0} in the set_target_url or set_target_body when the target is off.  DEFAULT: set_state_off  
set_target_body: The http body that will be sent with the request.  Place {0} in the string where you what the target string to occur.  DEFAULT: set_state_body  

## Get levels (Lightbulb) - For dimmable lights
get_level_url: The URL that gets the numeric level of the accessory.  
get_level_regex: The regex string that will return a numeric level value when matched against the get_level_url body.  DEFAULT: "\\d+"  
get_level_handling: Whether level is queried at a continuous interval, only when requested, or disabled. (continuous, onrequest, disabled). DEFAULT:"onrequest"  

## Set levels (Lightbulb) - For dimmable lights
set_level_url: The URL that sets the numeric level of the accessory.  
set_level_method: The http method that will be used when using the set_level_url. Place {0} in the string where you want the level string to occur. DEFAULT: set_state_method  
set_level_body: The http body that will be sent with the request.  Place {0} in the string where you what the numeric level string to occur. DEFAULT: "{0}"  



Configuration sample:

 ```
 