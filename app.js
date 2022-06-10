const FileSystem = require("fs");
const fetch = require('node-fetch');
const Papa = require('papaparse');
const { stringify } = require("querystring");
const blankchar = '󠀀';
const { ChatClient } = require("dank-twitch-irc");
const { resourceLimits } = require("worker_threads");
const startTimeStamp = Date.now();

//Config Access
try {
  let configData = readDataJson(configFilePath);
  username = configData["username"];
  password = configData["token"];
} catch (err) {
  console.error(typeof err + " " + err.message);
  console.log("Error, could not read config/channels file. Quitting");
  process.exit(1);
}
let username = '';
let password = '';

//Client Access
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

//Global Variables
const trusted = ['ron__johnson_'];

//URL's
const activefiresURL = 'https://cwfis.cfs.nrcan.gc.ca/downloads/activefires/activefires.csv';
const hotspotURL = 'https://cwfis.cfs.nrcan.gc.ca/downloads/hotspots/hotspots.csv';
//Filepaths
const configFilePath = 'config1.json';
const activeFilepath = 'ActiveData.json';
const userdataFilepath = 'userdata.json';
const hotspotFilepath = 'HotSpotData.json';
//getCSV's
getCSV(activefiresURL, 'ActiveData');
getCSV(hotspotURL, 'HotspotData');

//Primary Commands
client.on("PRIVMSG", async (msg, channelName, self) => {
  console.log(`[#${msg.channelName}] ${msg.displayName}: ${msg.messageText}`);
  
  let cleanMessage = msg.messageText.replace(blankchar, '').trim();

  if (isCommand(cleanMessage, 'ping')) {
    let timeSeconds = (Date.now() - startTimeStamp) / 1000;
		client.say(msg.channelName,`@${msg.displayName}, Pong! 👋 FeelsDankMan running for ${timeSeconds.toFixed(2)}s`);
  }

  if (isCommand(cleanMessage, 'uptime')) {
    let timeSeconds = (Date.now() - startTimeStamp) / 1000;
		client.say(msg.channelName,`@${msg.displayName}, 👋 FeelsDankMan running for ${timeSeconds.toFixed(2)}s`);
  }

  if (isCommand(cleanMessage, 'code')) {
    client.say(msg.channelName, 'Here is the link to GitHub repo for my code :) https://github.com/ron-johnson-kek/bushfirebot')
  }

  if (isCommand(cleanMessage, 'commands')) {
    client.say(msg.channelName, 'A full list of my commands can be found here! https://github.com/ron-johnson-kek/BushFireBot/blob/master/commands.md')
  }

  if (trusted.includes(msg.displayName) && isCommand(cleanMessage, 'quit')) {
    client.say(msg.channelName, errlolwut)
  }
});

//Secondary Commands
client.on("PRIVMSG", async (msg, channelName, self) => {
  let cleanMessage = msg.messageText.replace(blankchar, '').trim();
  
  let hotspotData = readDataJson2(hotspotFilepath);
  let activeData = readDataJson2(activeFilepath);
  let userdata = readDataJson2(userdataFilepath);

  const usernameList = [];

  if (isCommand(cleanMessage, 'bigfires')) {
    activeData.forEach(Element => {
      if (Element[" hectares"] > 10000) {
      client.say(msg.channelName, `${Element[" firename"]} in ${Element.agency} is over 10000 ha currently at ${Element[" hectares"]} ha monkaS https://earth.google.com/web/search/${Element[" lat"]},+${Element[" lon"]}/`)
      }
    });
    
  }
//wip
  if (trusted.includes(msg.displayName) && isCommand(cleanMessage, 'hotspots')) {
    hotspotData.forEach(Element => {
      if (Element["fwi"] >= 50 && Element["fwi"] <= 100) {
      client.say(msg.channelName, `Hotspot located at ${Element["lat"]}, ${Element["lon"]} has crown fire potential monkaOMEGA (that means it burns the entire tree)`);
      }
    })
      
  }
//wip
  if (trusted.includes(msg.displayName) && isCommand(cleanMessage, 'addUser')) {
    
    FileSystem.writeFile(`./userdata.json`, username, err => {
      if(err){
        console.log("Error writing file" ,err)
      } else {
        console.log('JSON data is written to the userdata file successfully')
      }
    })
  }

});

//Functions
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