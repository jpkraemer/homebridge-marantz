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

MarantzAccessory.prototype.getState = function(callback) {
  request(this.statusURL, function (error, response, body) {
    if (error) {
      accessory.log('Error: ' + error); 
      callback(error); 
    } else {
      xml2js.parseString(body, callback);
    }
  });
}

MarantzAccessory.prototype.setState = function(command, callback) {
  request.post({
    url: this.commandURL,
    form: {
      cmd0: command
    }
  }, callback);  
}

MarantzAccessory.prototype.setOnOffState = function(powerOn, callback) {
  var accessory = this; 
  var state = powerOn ? 'ON' : 'OFF';

  accessory.setState('PutZone_OnOff/' + state, function(error){
    if (error) {
      accessory.log('Error: ' + error); 
      callback(error);
    } else {
      accessory.log('Set ' + accessory.name + ' to ' + state); 
      callback(null); 
    }
  });  
}

MarantzAccessory.prototype.getOnOffState = function(callback) {
  var accessory = this; 

  accessory.getState(function (err, result) {
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

MarantzAccessory.prototype.setMuteState = function (mute, callback) {
  var accessory = this; 
  accessory.getMuteState(function(err, currentState) {
    if (err) {
      accessory.log('Error: ' + error); 
      callback(error);
    } else {
      if (mute !== currentState) {
        accessory.setState('PutVolumeMute/TOGGLE', function (err) {
          if (err) {
            accessory.log('Error: ' + error); 
            callback(error);
          } else {
            accessory.log('Set ' + accessory.name + ' mute to ' + mute); 
            callback(null); 
          }
        });
      }
    }
  });
}

MarantzAccessory.prototype.getMuteState = function (callback) {
  var accessory = this; 

  accessory.getState(function (err, result) {
    if (err) {
      accessory.log('Error: ' + err); 
      callback(err); 
    } else {
      var state = result.item.Mute[0].value[0]; 
      accessory.log('State of ' + accessory.name + ' is: ' + state); 
      callback(null, (state === "on")); 
    }
  });
}

MarantzAccessory.prototype.setVolume = function (volume, callback) {
  var accessory = this; 
  var state = volume - 80; 

  this.setState('PutMasterVolumeSet/' + state, function(error){
    if (error) {
      accessory.log('Error: ' + error); 
      callback(error);
    } else {
      accessory.log('Set ' + accessory.name + ' volume to ' + state); 
      callback(null); 
    }
  });  
}

MarantzAccessory.prototype.getVolume = function (callback) {
  var accessory = this; 

  accessory.getState(function (err, result) {
    if (err) {
      accessory.log('Error: ' + err); 
      callback(err); 
    } else {
      var state = result.item.MasterVolume[0].value[0]; 
      var volume = parseInt(state) + 80; 
      accessory.log('State of ' + accessory.name + ' volume is: ' + volume); 
      callback(null, volume); 
    }
  });
}

MarantzAccessory.prototype.getServices = function() {
  this.log("Marantz Services Added");
  var switchService = new Service.Switch(); 

  switchService.getCharacteristic(Characteristic.On)
  .on('set', this.setOnOffState.bind(this))
  .on('get', this.getOnOffState.bind(this));

  var speakerService = new Service.Speaker(); 

  speakerService.getCharacteristic(Characteristic.Mute)
  .on('set', this.setMuteState.bind(this))
  .on('get', this.getMuteState.bind(this));

  speakerService.addCharacteristic(Characteristic.Volume)
  .on('set', this.setVolume.bind(this))
  .on('get', this.getVolume.bind(this));

  return [switchService, speakerService]; 
}
