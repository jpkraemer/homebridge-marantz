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
  homebridge.registerPlatform("homebridge-marantzPlatform", "MarantzPlatform", MarantzPlatform, true);
}

function MarantzPlatform(log, config) {
  log("MarantzPlatform Init"); 

  this.log = log; 
  this.config = config; 
  this.accessories = []; 

  this.ip = config['ip']; 
  this.statusURL = "http://" + ip + '/goform/formMainZone_MainZoneXml.xml'; 
  this.commandURL = "http://" + ip + '/MainZone/index.put.asp'; 
}

MarantzPlatform.prototype.setState = function(powerOn, callback) {
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

MarantzPlatform.prototype.getState = function(callback) {
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
          var state = results.item.ZonePower.value; 
          accessory.log('State of ' + accessory.name + ' is: ' + state); 
          callback(null, state); 
        }
      });
    }
  });
}

MarantzPlatform.prototype.getServices = function() {
  var switchService = new Service.Switch(); 

  var characteristic = switchService.getCharacteristic(characteristic.On);
  characteristic.on('set', this.setState.bind(this)); 
  characteristic.on('get', this.getState.bind(this)); 

  return [switchService]; 
}