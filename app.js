const FileSystem = require("fs");
const fetch = require('node-fetch');
const Papa = require('papaparse');
const { stringify } = require("querystring");
const configFilePath = 'config1.json';
const blankchar = '󠀀';
const { ChatClient } = require("dank-twitch-irc");
const { resourceLimits } = require("worker_threads");

let username = '';
let password = '';

try {
  let configData = readDataJson(configFilePath);
  username = configData["username"];
  password = configData["token"];
} catch (err) {
  console.error(typeof err + " " + err.message);
  console.log("Error, could not read config/channels file. Quitting");
  process.exit(1);
}

let client = new ChatClient({
  username: username,
  password: password,
  rateLimits: "default",
});

client.on("connecting", () => { console.log("Connecting") });
client.connect();
client.join('ron__johnson_');

client.on("ready", () => console.log("Successfully connected to chat"));

client.on("close", (error) => {
  if (error != null) {
    console.error("Client closed due to error", error);
  }
});

//Method to get Active Fires data and write to file as JSON
const activefiresURL = 'https://cwfis.cfs.nrcan.gc.ca/downloads/activefires/activefires.csv';

getCSV(activefiresURL, 'ActiveData');

//Active Fires Message Stuff
const activeFilepath = 'ActiveData.json';

try {
  const ActiveJSONData = FileSystem.readFileSync(activeFilepath, 'utf-8');
  const activeData = JSON.parse(ActiveJSONData).data;
  const province = activeData
} catch (err) {
  console.error(typeof err + " " + err.message);
  console.error(err);
  console.log("Error, could not read Hotspot file. Quitting");
  process.exit(1);
}

//Method to get Hotspot data and write to file as JSON
//Need Way to Update and Refresh hsdata
const hotspotURL = 'https://cwfis.cfs.nrcan.gc.ca/downloads/hotspots/hotspots.csv';

getCSV(hotspotURL, 'HotspotData');

//Hotspot Message stuff
const hotspotFilepath = 'HotSpotData.json';
try {
  const hsjsondata = FileSystem.readFileSync(hotspotFilepath, 'utf-8')
  const hotspotData = JSON.parse(hsjsondata).data;
} catch (err) {
  console.error(typeof err + " " + err.message);
  console.error(err);
  console.log("Error, could not read Hotspot file. Quitting");
  process.exit(1);
}

//Primary
client.on("PRIVMSG", async (msg, channelName, self) => {
  console.log(`[#${msg.channelName}] ${msg.displayName}: ${msg.messageText}`);
  
  let cleanMessage = msg.messageText.replace(blankchar, '').trim();

  if (isCommand(cleanMessage, 'ping')) {
		client.say(msg.channelName,'pong');
  }

  if (isCommand(cleanMessage, 'code')) {
    client.say(msg.channelName, 'Here is the link to GitHub repo for my code :) https://github.com/ron-johnson-kek/bushfirebot')
  }

  if (isCommand(cleanMessage, 'quit')) {
    client.say(msg.channelName, errlolwut)
  }
});

//Secondary
client.on("PRIVMSG", async (msg, channelName, self) => {
  let cleanMessage = msg.messageText.replace(blankchar, '').trim();
  
  let hotspotData = readDataJson2(hotspotFilepath);
  let activeData = readDataJson2(activeFilepath);

  const usernameList = [];

  if (isCommand(cleanMessage, 'bigfires')) {
    activeData.forEach(Element => {
      if (Element[" hectares"] > 10000) {
      client.say(msg.channelName, `${Element[" firename"]} in ${Element.agency} is over 10000 ha currently at ${Element[" hectares"]} ha monkaS https://earth.google.com/web/search/${Element[" lat"]},+${Element[" lon"]}/`)
      }
    });
    
  }

  if (isCommand(cleanMessage, 'hotspots')) {
    hotspotData.forEach(Element => {
      if (Element["fwi"] >= 50 && Element["fwi"] <= 100) {
      client.say(msg.channelName, `Hotspot located at ${Element["lat"]}, ${Element["lon"]} has crown fire potential monkaOMEGA (that means it burns the entire tree)`);
      }
    })
      
  }
});

function isCommand(msg, command) {
  const prefix = '#';
  return msg.startsWith(prefix + command)
} 

function readDataJson(filePath) {
  let data = FileSystem.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

function readDataJson2(filePath) {
  let jsondata = FileSystem.readFileSync(filePath, 'utf8');
  return JSON.parse(jsondata).data;
}

function getCSV(csvURL, filename) {
  const response = fetch(csvURL)
   .then(response => response.text())
   .then(data => Papa.parse(data, {
       header: true,
       dynamicTyping: true
   }))
   .catch(err => console.log(err))

  response.then(data => {
    const newdata = JSON.stringify(data, null, "\t");
    FileSystem.writeFile(`./${filename}.json`, newdata, err => {
        if(err){
          console.log("Error writing file" ,err)
        } else {
          console.log(`JSON data is written to the ${filename} file successfully`)
        }
    });
});
}