/**
 * SCRAPER PROJECT ASSUMING A LISTING INDEX AND INDIVIDUAL DETAIL PAGES
 * We are using Selenium Standalone for this.  Selenium needs to run in another terminal window
 * selenium-standalone start
 * 
 */
//const puppeteer = require("puppeteer");
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');
puppeteer.use(pluginStealth());

// Add adblocker plugin to block all ads and trackers (saves bandwidth)
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// require proxy plugin
const PuppeteerExtraPluginProxy = require('puppeteer-extra-plugin-proxy2')

const fs = require("fs");
const fullDetailsArr = [];

const proxyListUrl = 'https://www.us-proxy.org/';
var approvedProxies=[];

var listingsJson;

var grabDetailIndex = 0;
var unique;

var config = {
  dirs : ["json", "json/fl-bar"],
  isProcessMainIndex : false, //DIRECTORY CHECK/WRITE
  baseUrl :
  "https://www.floridabar.org/directories/find-mbr/?lName=&sdx=N&fName=&eligible=Y&deceased=N&firm=&locValue=&locType=C&pracAreas=M04&lawSchool=&services=&langs=&certValue=&pageNumber=1&pageSize=50",
  puppeteerHeaders: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'upgrade-insecure-requests': '1',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-US,en;q=0.9,en;q=0.8'
}

}

//THE START URL

const stripParagraphTags = (str) => {
  let str2 = str.replace("<p>", "");
  str2 = str2.replace("</p>", "");
  return str2;
};

//LISTINGS
let scrapeListingslUrl = async (url) => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    var isNextPageExists = true;

    //spaces to dashes

    await page.goto(url);

    var results = []; // variable to hold collection of all book companys and profileUrls
    // defined simple loop to iterate over number of catalogue pages
    while (isNextPageExists) {
      // wait 1 sec for page load results selector
      await page.waitForSelector(".profiles-compact");

      // call and wait extractedEvaluateCallListing and concatenate results every iteration.
      // You can use results.push, but will get collection of collections at the end of iteration
      results = results.concat(await extractedEvaluateCallListing(page));
      // this is where next button on page clicked to jump to another page

      isNextPageExists = await getIfNextPageExists(page);
      console.log(`isNextExists: ${isNextPageExists}`);

      //wait attempt to avoid being blocked
      await page.waitForTimeout(1500);

      if (isNextPageExists) {
        // no next button on last page
        await page.click('a[title="next page"]');
      }

      //
    }

    browser.close();

    return results;
  } catch (error) {
    console.log("scrapeListingslUrl error");
    console.log(error);
  }
};

const getAllPageDetails = (document) => {
  let elements = document.querySelectorAll("div.row");
        els_array = Array.from(elements);
        return els_array;
  
}

let scrapeListingslUrlv2 = async (url) => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    var clickedIndex = 0;

    
    //spaces to dashes

    await page.goto(url);

      await page.waitForSelector(".profiles-compact");

      
      var profiles = await page.evaluate(() => {
        let elements = document.querySelectorAll("li.profile-compact");
        els_array = Array.from(elements);
        return els_array;
        //return headings_array.map(heading => heading.textContent);
      });

      var profilesCnt = profiles.length;

      console.log(`profilesCnt: ${profilesCnt}`);
      
      //profilesCnt
      while(clickedIndex < 3){
        console.log(`\\\\attempt to get detail index: ${clickedIndex}`);
        await page.waitForTimeout(2000);
        //click for detail page
        await page.click(`#output > div > ul > li:nth-child(${clickedIndex+1}) > div.profile-identity > div.profile-content > p.profile-name > a`);

        //grab details
        await page.waitForSelector('h1.full');
        var details = await page.evaluate(() => {
          let elements = getAllPageDetails(document);
          return elements;
          //return headings_array.map(heading => heading.textContent);
        });

        console.log('grabbed details');
        console.dir(details);

        //write details

        //click back button to return back to previous
        await page.goBack();

        //increase index
        clickedIndex++;
      }
      
      //
    

    await browser.close();
      return;
  } catch (error) {
    console.log("scrapeListingslUrl error");
    console.log(error);
  }
};


async function extractedEvaluateCallListing(page) {
  // just extracted same exact logic in separate function
  // this function should use async keyword in order to work and take page as argument
  return page.evaluate(() => {
    //CLEANUP THE PROTOCOL STRICTLY FOR FINDLAW.COM BECAUSE THEREE WERE SOME INCONSISTENCIES
    const cleanProtocol = (str) => {
      //strip https://
      let cleanUrl = str.replace("https://", "");

      //strip http://
      cleanUrl = cleanUrl.replace("http://", "");

      //final cleanup
      cleanUrl = cleanUrl.replace("//www.floridabar.org", "www.floridabar.org");

      return `https://${cleanUrl}`;
    };

    let data = [];
    let elements = document.querySelectorAll("li.profile-compact");

    for (var element of elements) {
      let profileName = element.querySelector("p.profile-name a");
      let fullName = profileName.innerText;
      let profileUrl = element.querySelector(" a").getAttribute("href");
      let imgFile = element
        .querySelector("div.profile-image > a > img")
        .getAttribute("src");
      let email = element.querySelector("a.icon-email").getAttribute("href");
      email = email.replace("mailto:", "");
      let barNum = element.querySelector(
        "p.profile-bar-number > span"
      ).innerText;

      data.push({
        fullName,
        profileUrl: cleanProtocol(profileUrl),
        imgFile,
        email,
        barNum,
      });
    }

    return data;
  });
}

/**
 * Check if next page selector exists
 * @param {*} page
 * @returns boolean
 */
async function getIfNextPageExists(page) {
  // just extracted same exact logic in separate function
  // this function should use async keyword in order to work and take page as argument
  return page.evaluate(() => {
    let element = document.querySelector('a[title="next page"]');

    if (element) {
      return true;
    }

    return false;
  });
}

const grabFullDetail = async (url) => {
  //

  let updateDetailIndex = fullDetailsArr.map((o) => o.profileUrl).indexOf(url);
  let updateDetailEl = fullDetailsArr[updateDetailIndex];

  let {dirs} = config;

  console.log(`attempt grabFullDetail for: ${url}`);
  //const browser = await puppeteer.launch({ headless: false });

  const browser = await puppeteer.launch({ headless: false }).then(async browser => {
    const page = await browser.newPage();
  await page.setExtraHTTPHeaders(config.puppeteerHeaders);
  
  // Configure the navigation timeout
  await page.setDefaultNavigationTimeout(0);

  await page.waitForTimeout(1500);
  await page.goto(url, { waitUntil: "networkidle2" });

  //wait for overview text
  await page.waitForSelector("#mProfile");

  //click the toggle to expose full description
  //await page.click("a#read_more_toggle");

  const companyDetails = await page.evaluate(() => {
    const getInnerTextValue = (sel) => {
      if (sel) {
        return sel.innerText.trim();
      }
      return "";
    };

    const getRowDetailByLabel = (searchText = "", format = "text") => {
      var nodes = document.querySelectorAll("#mProfile .row");
      for (let i = 0; i < nodes.length; i++) {
        let rowNode = nodes[i];
        if (rowNode.children[0].innerText === searchText) {
          if (format === "text") {
            return rowNode.children[1].innerText;
          }
          var htmlStr = rowNode.children[1].innerHTML.trim();
          htmlStr = htmlStr.replace(/[\n\r]+/g, "");
          //dboule spaces
          //htmlStr = htmlStr.replace(/  +/g, "");
          htmlStr = htmlStr.replace(/\s{2,10}/g, "");
          //cleanse
          return htmlStr;
          break;
        }
      }

    
      return "unknown";
    };

    var barNum = getRowDetailByLabel("Bar Number:", "text");

    var addressHtml = getRowDetailByLabel("Mail Address:", "html");
    const addressPhoneSplit = addressHtml.split("</p><p>");
    let addressPieces = addressPhoneSplit[0].split("<br>");
    for (let i = 0; i < addressPieces.length; i++) {
      var el = addressPieces[i];
      //clean up misc html tags
      el = el.replace(/<\/?[^>]+(>|$)/gi, "");

      addressPieces[i] = el;
    }

    var companyName = addressPieces[0];
    var address = addressPieces[1];

    var city_state_zip = addressPieces[2].split(", ");
    var zip = city_state_zip[1].split(" ")[1];

    const getPhoneDetailByLabel = (str) => {
      if (addressPhoneSplit[1].includes(str)) {
        let str2 = addressPhoneSplit[1];
        str2 = str2.replace("&nbsp;", "");
        str2 = str2.replace(str, "");
        let  tmpDiv = document.createElement("p");
        tmpDiv.setAttribute("id", "tmpDiv");
        tmpDiv.innerHTML = str2;
        let tmpTxt = tmpDiv.innerText;
        delete tmpDiv;
        return tmpTxt;
      }
      return "";
    };

    var officePhone = getPhoneDetailByLabel("Office:");
    var cellPhone = getPhoneDetailByLabel("Cell:");
    var faxPhone = getPhoneDetailByLabel("Fax:");

    var practiceAreasHtml = String(getRowDetailByLabel("Practice Areas:", "html"));
    var practiceAreas = practiceAreasHtml.split('</p><p>');
    
    for (let i = 0; i < practiceAreas.length; i++) {
      var el = practiceAreas[i];
      //clean up misc html tags
      el = el.replace("<p>", "");
      el = el.replace("</p>","");

      practiceAreas[i] = el;
    }
    

    return {
      fullName: document.querySelector("h1.full").innerText,
      barNum,
      addressHtml,
      companyName,
      address,
      city: city_state_zip[0],
      state: "FL",
      zip,
      officePhone,
      cellPhone,
      faxPhone,
      county: getRowDetailByLabel("County:", "text"),
      circuit: getRowDetailByLabel("Circuit:", "text"),
      admitted: getRowDetailByLabel("Admitted:", "text"),
      tenYearDisciplineHistory: getRowDetailByLabel("10-Year Discipline History:", "text"),
      lawSchool: getRowDetailByLabel("Law School:", "text"),
      practiceAreas,
      firmName: getRowDetailByLabel("Firm:", "text"),
      firmSize: getRowDetailByLabel("Firm Size:", "text"),
      firmPosition: getRowDetailByLabel("Firm Position:", "text"),
      firmWebsite: getRowDetailByLabel("Firm Website:", "text")
    };
  });

  console.log(`final details for the company were`);
  console.log(companyDetails);

  const fileNameClean = (str) => {
    let str2 = str;

    //spaces to dashes
    str2 = str2.replace(/\s+/g, "-");
    //replace all non alphanumeric with dash
    str2 = str2.replace(/[\W_]+/g, "-");
    return str2;
  };


  for (let i = 0; i < dirs.length; i++) {
    if (!fs.existsSync(dirs[i])) {
      fs.mkdirSync(dirs[i]);
    }
  }

  let fileId = companyDetails.barNum;
  //remove hastags if exists
  fileId = fileId.replace('#', '');

  let jsonFile = `${dirs[1]}/${fileId}.json`;
  console.log(`which should be written to: ${jsonFile}`);

  //END

  //delete companyDetails.scrapePieces;
  let data = JSON.stringify(companyDetails, null, 4);
  fs.writeFileSync(jsonFile, data);
  grabDetailIndex++;
  grabNextDetail();
  });


  
};

const randomIntFromInterval = (min, max) =>{ // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const grabFullDetailV2 = async (url) => {
  //

  let updateDetailIndex = fullDetailsArr.map((o) => o.profileUrl).indexOf(url);
  let updateDetailEl = fullDetailsArr[updateDetailIndex];

  var longWaitMs = 10000;

  
  
  //const browser = await puppeteer.launch({ headless: false });

  // add proxy plugin without proxy crendentials

  const randomProxyIdx = randomIntFromInterval(0,approvedProxies.length);
  const proxyEl = approvedProxies[randomProxyIdx];
  const proxyAddress = proxyEl.ip;
  const proxyPort = proxyEl.port;

  console.log(`attempt grabFullDetail for: ${url} with proxyAddress:${proxyAddress} and proxyPort: ${proxyPort}`);
  /*
  puppeteer.use(PuppeteerExtraPluginProxy({
    proxy: `http://${proxyAddress}:${proxyPort}`
  }));
  */

  const browser = await puppeteer.launch({ headless: true }).then(async browser => {
    const page = await browser.newPage();
  //await page.setExtraHTTPHeaders(config.puppeteerHeaders);
  
  // Configure the navigation timeout
  await page.setDefaultNavigationTimeout(0);

  
  await page.goto(url, { waitUntil: "networkidle2" });

  //wait for overview text
  await page.waitForSelector("#mProfile");

  //click the toggle to expose full description
  //await page.click("a#read_more_toggle");

  await page.waitForTimeout(longWaitMs);

  const companyDetails = await page.evaluate(() => {
    const getInnerTextValue = (sel) => {
      if (sel) {
        return sel.innerText.trim();
      }
      return "";
    };

    const getRowDetailByLabel = (searchText = "", format = "text") => {
      var nodes = document.querySelectorAll("#mProfile .row");
      for (let i = 0; i < nodes.length; i++) {
        let rowNode = nodes[i];
        if (rowNode.children[0].innerText === searchText) {
          if (format === "text") {
            return rowNode.children[1].innerText;
          }
          var htmlStr = rowNode.children[1].innerHTML.trim();
          htmlStr = htmlStr.replace(/[\n\r]+/g, "");
          //dboule spaces
          //htmlStr = htmlStr.replace(/  +/g, "");
          htmlStr = htmlStr.replace(/\s{2,10}/g, "");
          //cleanse
          return htmlStr;
          break;
        }
      }

    
      return "unknown";
    };

    var barNum = getRowDetailByLabel("Bar Number:", "text");

    var addressHtml = getRowDetailByLabel("Mail Address:", "html");
    const addressPhoneSplit = addressHtml.split("</p><p>");
    let addressPieces = addressPhoneSplit[0].split("<br>");
    for (let i = 0; i < addressPieces.length; i++) {
      var el = addressPieces[i];
      //clean up misc html tags
      el = el.replace(/<\/?[^>]+(>|$)/gi, "");

      addressPieces[i] = el;
    }

    var companyName = addressPieces[0];
    var address = addressPieces[1];

    var city_state_zip = addressPieces[2].split(", ");
    var zip = city_state_zip[1].split(" ")[1];

    const getPhoneDetailByLabel = (str) => {
      if (addressPhoneSplit[1].includes(str)) {
        let str2 = addressPhoneSplit[1];
        str2 = str2.replace("&nbsp;", "");
        str2 = str2.replace(str, "");
        let  tmpDiv = document.createElement("p");
        tmpDiv.setAttribute("id", "tmpDiv");
        tmpDiv.innerHTML = str2;
        let tmpTxt = tmpDiv.innerText;
        delete tmpDiv;
        return tmpTxt;
      }
      return "";
    };

    var officePhone = getPhoneDetailByLabel("Office:");
    var cellPhone = getPhoneDetailByLabel("Cell:");
    var faxPhone = getPhoneDetailByLabel("Fax:");

    var practiceAreasHtml = String(getRowDetailByLabel("Practice Areas:", "html"));
    var practiceAreas = practiceAreasHtml.split('</p><p>');
    
    for (let i = 0; i < practiceAreas.length; i++) {
      var el = practiceAreas[i];
      //clean up misc html tags
      el = el.replace("<p>", "");
      el = el.replace("</p>","");

      practiceAreas[i] = el;
    }
    

    return {
      fullName: document.querySelector("h1.full").innerText,
      barNum,
      addressHtml,
      companyName,
      address,
      city: city_state_zip[0],
      state: "FL",
      zip,
      officePhone,
      cellPhone,
      faxPhone,
      county: getRowDetailByLabel("County:", "text"),
      circuit: getRowDetailByLabel("Circuit:", "text"),
      admitted: getRowDetailByLabel("Admitted:", "text"),
      tenYearDisciplineHistory: getRowDetailByLabel("10-Year Discipline History:", "text"),
      lawSchool: getRowDetailByLabel("Law School:", "text"),
      practiceAreas,
      firmName: getRowDetailByLabel("Firm:", "text"),
      firmSize: getRowDetailByLabel("Firm Size:", "text"),
      firmPosition: getRowDetailByLabel("Firm Position:", "text"),
      firmWebsite: getRowDetailByLabel("Firm Website:", "text")
    };
  });

  console.log(`final details for the company were`);
  console.log(companyDetails);

  const fileNameClean = (str) => {
    let str2 = str;

    //spaces to dashes
    str2 = str2.replace(/\s+/g, "-");
    //replace all non alphanumeric with dash
    str2 = str2.replace(/[\W_]+/g, "-");
    return str2;
  };

  writeFile (companyDetails.barNum, companyDetails);
  
  grabDetailIndex++;
  grabNextDetail();
  });


  
};

const writeFile = async(fileId, data) => {

  let {dirs} = config;


  for (let i = 0; i < dirs.length; i++) {
    if (!fs.existsSync(dirs[i])) {
      fs.mkdirSync(dirs[i]);
    }
  }

  //remove hastags if exists
  fileId = fileId.replace('#', '');

  let jsonFile = `${dirs[1]}/${fileId}.json`;
  console.log(`which should be written to: ${jsonFile}`);

  //END

  //delete companyDetails.scrapePieces;
  let dataToWrite = JSON.stringify(data, null, 4);
  fs.writeFileSync(jsonFile, dataToWrite);

}


///BOTTOM IS WORKING BUT TEMPORARILY DISABLED
//setup scrape detail then comment out once completed
/*
grabFullDetail(
  "https://www.floridabar.org/directories/find-mbr/profile/?num=92228"
);
*/

function grabNextDetail () {
  let {dirs} = config;
  let fileId = 0;
  let url;

  for (let i=0;i<listingsJson.length;i++){
    fileId = unique[grabDetailIndex].split('?num=')[1];
    let jsonFile = `${dirs[1]}/${fileId}.json`;
  
    if (fs.existsSync(jsonFile)) {
      grabDetailIndex=i+1;
    }  
  };
  //let url = unique[grabDetailIndex];

  

  url = `https://www.floridabar.org/mybarprofile/${fileId}`;

  console.log(`we shoudl attempt to grabDetailIndex for: ${grabDetailIndex} which should be url: ${url}`);
  
  grabFullDetailV2(url);
}


//PERFORM THE DUTIES
//setup proxies

var scrapeProxiesListingslUrl = async (url) => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    
    //spaces to dashes

    await page.goto(url);

    var results = []; // variable to hold collection of all book companys and profileUrls
    // defined simple loop to iterate over number of catalogue pages
    
      // wait 1 sec for page load results selector
      await page.waitForSelector(".fpl-list");

      // call and wait extractedEvaluateCallListing and concatenate results every iteration.
      // You can use results.push, but will get collection of collections at the end of iteration
      results = results.concat(await extractedEvaluateCallListing2(page));
      // this is where next button on page clicked to jump to another page

      
      //wait attempt to avoid being blocked
      await page.waitForTimeout(1500);

      
    browser.close();
    
    //return results;

    let filteredProxies = results.filter(row => row.anonymity !=='transparent');
    return filteredProxies;
    
  } catch (error) {
    console.log("scrapeListingslUrl error");
    console.log(error);
  }
};


async function extractedEvaluateCallListing2(page) {
  // just extracted same exact logic in separate function
  // this function should use async keyword in order to work and take page as argument
  const result = await page.evaluate(() => {
    const rows = document.querySelectorAll('.fpl-list tbody tr');
    return Array.from(rows, row => {
      const columns = row.querySelectorAll('td');
      return Array.from(columns, column => column.innerText);
    });
  });

  //mappedData
  var mappedData=[];

  for(let i=0;i<result.length;i++){
    var res = result[i];

        mappedData.push(
          {
            'ip': res[0],
            'port': res[1],
            'countryCode': res[2],
            'country': res[3],
            'anonymity': res[4],
        'google': res[5],
        'https': res[6],
        'lastChecked': res[7]
          }

   ); 
  }
  return mappedData;
  //original data;
  //return result;

 
}


const mainProcessing = async() => {
  try {
    scrapeListingslUrlv2(config.baseUrl);

    /*
    //01. Setup Proxies
    approvedProxies = await scrapeProxiesListingslUrl(proxyListUrl);  
    console.log('final approvedProxies');
    console.dir(approvedProxies);
    
    //02. actual processing
    
    if(config.isProcessMainIndex){
    scrapeListingslUrl(config.baseUrl).then((value) => {

      //WRITE THE BASIC LISTING
      let jsonFile = `${config.dirs[1]}/index.json`;
      let data = JSON.stringify(value, null, 4);
      fs.writeFileSync(jsonFile, data);
    
      //PROCESS THE BASIC LISTING
      console.log(value);
      console.log("Collection length: " + value.length);
      console.log(value[0]);
      console.log(value[value.length - 1]);
      
      //GET THE UNIQUE PROFILE LINKS
      unique = [...new Set(value.map((item) => item.profileUrl))];
      console.log(`unique profileUrls: ${unique.length}`);
    
      grabNextDetail();  
    });  
    }else{
      console.log('process from index.json');
      fs.readFile(`${config.dirs[1]}/index.json`, 'utf8', function(err, data){
        // Display the file content
        listingsJson = JSON.parse(data);
        console.dir(listingsJson);
        unique = [...new Set(listingsJson.map((item) => item.profileUrl))];
        grabNextDetail();
    });
    }
    */

  } catch (error) {
    console.log('mainProcessing error');
    console.log(error);
  }
  
  

}

mainProcessing();
