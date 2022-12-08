const FileSystem = require("fs");
const fetch = require('node-fetch');
const Papa = require('papaparse');
const { stringify } = require("querystring");
const blankchar = '󠀀';
const { ChatClient } = require("dank-twitch-irc");
const { resourceLimits } = require("worker_threads");
const startTimeStamp = Date.now();
//Filepaths
const configFilePath = 'config1.json';
const activeFilepath = 'ActiveData.json';
const hotspotFilepath = 'HotSpotData.json';
const subscribersFilepath = 'subscribers.json';
//Config Access
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
//Define and Load the subscribers data
let subscribers = {};
try {
  subscribers = readDataJson(subscribersFilepath);
} catch (err) {
  //If the file does not exist, create an empty subscribers object
  subscribers = {};
}

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
const trusted = ['ron__johnson_', 'ron__bot'];
const usernameList = [];
//URL's
const activefiresURL = 'https://cwfis.cfs.nrcan.gc.ca/downloads/activefires/activefires.csv';
const hotspotURL = 'https://cwfis.cfs.nrcan.gc.ca/downloads/hotspots/hotspots.csv';
//getCSV's
getCSV(activefiresURL, 'ActiveData');
getCSV(hotspotURL, 'HotspotData');

//Primary Commands
client.on("PRIVMSG", async (msg, channelName, self) => {
  console.log(`[#${msg.channelName}] ${msg.displayName}: ${msg.messageText}`);
  let cleanMessage = msg.messageText.replace(blankchar, '').trim();
  let timeSeconds = (Date.now() - startTimeStamp) / 1000;

  if (cleanMessage[0] !== '#') {
    return;
  }

  //Parse command and args
  let [command, ...args] = cleanMessage.slice(1).split(" ");

  switch(command) {
    case 'ping':  
		  client.say(msg.channelName,`@${msg.displayName}, Pong! 👋 FeelsDankMan running for ${timeSeconds.toFixed(2)}s`);
      console.log('ping')
      break;

    case 'uptime':
		  client.say(msg.channelName,`@${msg.displayName}, 👋 FeelsDankMan running for ${timeSeconds.toFixed(2)}s`);
      break;

    case 'code':
      client.say(msg.channelName, 'Here is the link to GitHub repo for my code :) https://github.com/ron-johnson-kek/bushfirebot')
      break;

    case 'commands':
      client.say(msg.channelName, 'A full list of my commands can be found here! https://github.com/ron-johnson-kek/BushFireBot/blob/master/commands.md')
      break;

    case 'quit':
      if(trusted.includes(msg.displayName)) {
        process.exit();
      }
      break;
  }

//Secondary Commands

  let hotspotData = readDataJson2(hotspotFilepath);
  let activeData = readDataJson2(activeFilepath);
  let numactivefires = Object.keys(activeData).length;

  switch (command) {
    case 'fireforecast':
      let usercountry = cleanMessage.substring(14);
      client.say(msg.channelName, `${getCountry(usercountry)}`)
      break;
    
    case 'activefires':
      client.say(msg.channelName, `${rateNumactivefires(numactivefires)}`)
      break;
    
    case 'bigfires':
      activeData.forEach(Element => {
        if (Element[" hectares"] > 10000) {
        client.say(msg.channelName, `${Element[" firename"]} in ${Element.agency} is over 10000 ha currently at ${Element[" hectares"]} ha monkaS https://earth.google.com/web/search/${Element[" lat"]},+${Element[" lon"]}/`)
        }
      });
      break;
    //wip
    case 'hotspots':
      if (trusted.includes(msg.displayName)) {
        hotspotData.forEach(Element => {
        if (Element["fwi"] >= 100 && Element["fwi"] <= 150) {
          client.say(msg.channelName, `Hotspot located at ${Element["lat"]}, ${Element["lon"]} has crown fire potential monkaOMEGA (that means it burns the entire tree)`);
          }
        })
      }
      break;
  
    case 'subscribe':
      // Add the user to the list of subscribers
      if (!subscribers[msg.displayName]) {
        subscribers[msg.displayName] = true;
        client.say(msg.channelName, `@${msg.displayName}, you have been added to the list of subscribers.`);
      } else {
        client.say(msg.channelName, `@${msg.displayName}, you are already on the list of subscribers.`);
      }

      // Save the updated subscribers list to the file
      writeDataJson(subscribersFilepath, subscribers);
      break;
    
    case 'set':
      // Check if the user is a subscriber
      if (subscribers[msg.displayName]) {
      // Update the user's subscription with the given location
      subscribers[msg.displayName] = args[0];

      // Confirm the update
      client.say(msg.channelName, `@${msg.displayName}, your subscription has been updated with location: ${args[0]}.`);

      // Save the updated subscribers list to the file
      writeDataJson(subscribersFilepath, subscribers);
      } else {
      client.say(msg.channelName, `@${msg.displayName}, you are not currently a subscriber. Use the '#subscribe' command to subscribe.`);
      }
      break;
  }
});

//Functions

function readDataJson(filePath) {
  let data = FileSystem.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

function readDataJson2(filePath) {
  let jsondata = FileSystem.readFileSync(filePath, 'utf8');
  return JSON.parse(jsondata).data;
}

function writeDataJson(filepath, data) {
  // Convert the data to a JSON string
  const dataString = JSON.stringify(data, {
    encoding: 'utf8',
    spaces: 2
  });

  // Write the JSON string to the file
  FileSystem.writeFileSync(filepath, dataString);
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

function rateNumactivefires(num) { 
  return num > 40 && num < 50 ? `There are ${num} active fires in North America KKonaW`
  : num > 50 && num < 80 ? `There are ${num} active fires in Canada, be careful out there! KKonaW 🔥`
  : num > 80 && num < 100 ? `There are ${num} active fires in Canada, be careful out there! KKonaW o 0 ( monkaS 🔥 )`
  : num > 100 ? `There are ${num} active fires in Canada, stay inside monkaOMEGA` 
  : `There are ${num} active fires in North America PagMan`
  
}

function getCountry(country) {
  let thisMonth = new Date();
  let date = (thisMonth.getMonth()+1);
  country = country.toLowerCase();
  return country === 'canada'? `Here is the seasonal forecast for Canada, updated monthly FeelsOkayMan https://cwfis.cfs.nrcan.gc.ca/data/maps/seasonal_forecast/2022/fsr0${date}.png`
  : country === 'usa' || country === 'united states' || country === 'us' ? 'Here is a daily forecast for the contiguous USA FeelsOkayMan http://www.wfas.net/images/firedanger/fd_cls_f.png'
  : country === 'australia' || country === 'aussie' ? 'Here is your seasonal outlook KKrikey 👍 https://www.afac.com.au/docs/default-source/bushfire-seasonal-outlook/seasonaloutlook_autumn_2022_v1-0.pdf' 
  : country === 'uk' || country === 'united kingdom' ? 'Here is the seasonal forecast for the UK'
  : 'Unfortunately I currently do not support the country provided Sadeg'
}