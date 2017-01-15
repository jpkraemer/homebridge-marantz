var request = require('request'); 
var xml2js = require('xml2js');

var Accessory, Service, Characteristc, UUIDGen; 

module.exports = function(homebridge) {
  console.log("homebridge API version: " + homebridge.version);

  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory;

  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  
  // For platform plugin to be considered as dynamic platform plugin,
  // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
  homebridge.registerAccessory("homebridge-marantz", "Marantz", MarantzAccessory);
}

function MarantzAccessory(log, config) {
  log("MarantzPlatform Init"); 

  this.log = log; 
  this.config = config; 
  this.name = config['name']; 

  this.ip = config['ip']; 
  this.statusURL = "http://" + this.ip + '/goform/formMainZone_MainZoneXml.xml'; 
  this.commandURL = "http://" + this.ip + '/MainZone/index.put.asp'; 
}

MarantzAccessory.prototype.setState = function(powerOn, callback) {
  var accessory = this; 
  var state = powerOn ? 'ON' : 'OFF';

  request.post({
    url: this.commandURL,
    form: {
      cmd0: 'PutZone_OnOff/' + state
    }
  }, function (error, res, body) {
    if (error) {
      accessory.log('Error: ' + error); 
      callback(error);
    } else {
      accessory.log('Set ' + accessory.name + ' to ' + state); 
      callback(null); 
    }
  });  
}

MarantzAccessory.prototype.getState = function(callback) {
  var accessory = this; 

  request(this.statusURL, function (error, response, body) {
    if (error) {
      accessory.log('Error: ' + error); 
      callback(error); 
    } else {
      xml2js.parseString(body, function (err, result) {
        if (err) {
          accessory.log('Error: ' + err); 
          callback(err); 
        } else {
          var state = result.item.ZonePower[0].value[0]; 
          accessory.log('State of ' + accessory.name + ' is: ' + state); 
          callback(null, (state === "ON")); 
        }
      });
    }
  });
}

MarantzAccessory.prototype.getServices = function() {
  var switchService = new Service.Switch(); 

  var characteristic = switchService.getCharacteristic(Characteristic.On);
  characteristic.on('set', this.setState.bind(this)); 
  characteristic.on('get', this.getState.bind(this)); 

  return [switchService]; 
}
