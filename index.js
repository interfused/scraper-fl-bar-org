/**
 * SCRAPER PROJECT ASSUMING A LISTING INDEX AND INDIVIDUAL DETAIL PAGES
 */
const puppeteer = require("puppeteer");
const fs = require("fs");
const fullDetailsArr = [];

//THE START URL
const baseUrl =
  "https://www.floridabar.org/directories/find-mbr/?lName=&sdx=N&fName=&eligible=Y&deceased=N&firm=&locValue=&locType=C&pracAreas=M04&lawSchool=&services=&langs=&certValue=&pageNumber=1&pageSize=50";

/*
let scrape = async (locCity, locState) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  var isNextPageExists = true;

  //spaces to dashes
  let locCityClean = locCity.replace(/\s+/g, "-");
  let locStateClean = locState.replace(/\s+/g, "-");

  await page.goto(
    `https://lawyers.findlaw.com/lawyer/firm/medical-malpractice/${locCityClean.toLowerCase()}/${locStateClean.toLowerCase()}`
  );

  var results = []; // variable to hold collection of all book companys and profileUrls
  var lastPageNumber = 2; // this is hardcoded last catalogue page, you can set it dynamically if you wish
  // defined simple loop to iterate over number of catalogue pages
  while (isNextPageExists) {
    // wait 1 sec for page load
    await page.waitForSelector(".serp_result");
    // call and wait extractedEvaluateCallListing and concatenate results every iteration.
    // You can use results.push, but will get collection of collections at the end of iteration
    results = results.concat(await extractedEvaluateCallListing(page));
    // this is where next button on page clicked to jump to another page

    isNextPageExists = await getIfNextPageExists(page);
    console.log(`isNextExists: ${isNextPageExists}`);
    if (isNextPageExists) {
      // no next button on last page
      await page.click('li.pagination-next a[rel="next"]');
    }

    //
  }

  browser.close();

  return results;
};
*/

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

let scrapeDetaillUrl = async (url) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  var isNextPageExists = true;

  //spaces to dashes

  await page.goto(url);

  var results = []; // variable to hold collection of all book companys and profileUrls
  var lastPageNumber = 2; // this is hardcoded last catalogue page, you can set it dunamically if you wish
  // defined simple loop to iterate over number of catalogue pages
  while (isNextPageExists) {
    // wait 1 sec for page load
    await page.waitForSelector(".serp_result");
    // call and wait extractedEvaluateCallListing and concatenate results every iteration.
    // You can use results.push, but will get collection of collections at the end of iteration
    results = results.concat(await extractedEvaluateCallListing(page));
    // this is where next button on page clicked to jump to another page

    isNextPageExists = await getIfNextPageExists(page);
    console.log(`isNextExists: ${isNextPageExists}`);
    if (isNextPageExists) {
      // no next button on last page
      await page.click('li.pagination-next a[rel="next"]');
    }

    //
  }

  browser.close();

  return results;
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
/*
const grabFullDetailOLD = async (url) => {
  //

  let updateDetailIndex = fullDetailsArr.map((o) => o.profileUrl).indexOf(url);
  let updateDetailEl = fullDetailsArr[updateDetailIndex];

  console.log(`attempt grabFullDetail for: ${url}`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url);
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

    let cleanAddressSegments = document.querySelector("p.pp_card_street");
    let segLen = cleanAddressSegments.childElementCount;
    let address1 = getInnerTextValue(
      cleanAddressSegments.querySelector("span.pp_card_street:nth-of-type(1)")
    );

    let address2 = getInnerTextValue(
      cleanAddressSegments.querySelector("span.pp_card_street:nth-of-type(2)")
    );

    let city = getInnerTextValue(
      document.querySelector(
        `p.pp_card_street > span:nth-of-type(${segLen - 2})`
      )
    );
    let state = getInnerTextValue(
      document.querySelector(
        `p.pp_card_street > span:nth-of-type(${segLen - 1})`
      )
    );
    state = state.replace(",", "").trim();
    let zip = getInnerTextValue(
      document.querySelector(`p.pp_card_street > span:nth-of-type(${segLen})`)
    );
    let website = "";
    if (document.querySelector("a.listing-desc-button")) {
      website = document
        .querySelector("a.listing-desc-button")
        .getAttribute("href");
      if (website.includes("?")) {
        website = website.split("?")[0];
      }
    }

    let phone = getInnerTextValue(
      document.querySelector(".svg-icon-phone + span")
    );

    let profilePhotoUrl = "";
    if (document.querySelector("img#profile_photo_block")) {
      profilePhotoUrl = document
        .querySelector("img#profile_photo_block")
        .getAttribute("src");
    }

    let tmpEls = document.querySelectorAll(".card.more-info .block_content");
    let moreBlocks = [];
    console.log(`tmpEls len: ${tmpEls.length}`);

    //convert html list to string list separated by a pipe (|)
    const htmlListToStringList = (htmlStr) => {
      let str = htmlStr.trim().replace(/>\s+</g, "><");

      str = str.replaceAll("<ul><li>", "");
      str = str.replaceAll("</li></ul>", "");
      str = str.replaceAll("</li><li>", "|");
      str = str.replaceAll(" |", "|");
      str = str.replaceAll("| ", "|");
      return str.trim();
    };

    //camelize string
    function camelize(str) {
      return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, "");
    }

    var keys = [];

    for (var el of tmpEls) {
      let k = camelize(el.querySelector("h4").innerText);
      if (keys.includes(k)) {
        continue;
      }
      keys.push(k);
      let v = el.querySelector(".block_content_body").innerHTML;
      //moreBlocks[k] = v;
      let tmpObj = {};
      //SKIP PHOTOS
      if (!["photo", "address", "phone", "fax", "email"].includes(k)) {
        //CLEAN LISTS TO STANDARD PIPE SEPARATED
        if (
          [
            "practiceAreas",
            "languages",
            "classesAndSeminars",
            "websites",
          ].includes(k)
        ) {
          v = htmlListToStringList(v);
        }

        if (["offersFreeInitialConsultation"].includes(k)) {
          v = v.replace("<p>Yes</p>", "Yes");
        }

        tmpObj[k] = v;
        moreBlocks.push(tmpObj);
      }
    }

    let fax = getInnerTextValue(document.querySelector(".pplus_firm_fax"));

    //SOCIAL LINKS
    let social_fb = "";
    let social_twitter = "";
    let social_linkedin = "";
    let social_instagram = "";

    const getMoreBlockValue = (k) => {
      for (let i = 0; i < moreBlocks.length; i++) {
        let obj = moreBlocks[i];

        if (k in obj) {
          return obj[k];
        }
      }
      return "";
    };

    const getScrapePlacementDetails = (str) => {
      let pieces = str.split("/");
      return { name: pieces[5], state: pieces[6], city: pieces[7] };
    };
    const scrapePieces = getScrapePlacementDetails(window.location.href);

    let description = "";
    if (document.querySelector("div#pp_overview_text")) {
      description = document.querySelector("div#pp_overview_text").innerHTML;
    }

    return {
      companyName: document.querySelector("h1.listing-details-header")
        .innerText,
      address1,
      address2,
      city,
      state,
      zip,
      website,
      phone,
      fax,
      profilePhotoUrl,
      moreBlocks,
      practiceAreas: getMoreBlockValue("practiceAreas"),
      litigation: getMoreBlockValue("litigation"),
      languages: getMoreBlockValue("languages"),

      classesAndSeminars: getMoreBlockValue("classesAndSeminars:"),
      offersFreeInitialConsultation: getMoreBlockValue(
        "offersFreeInitialConsultation"
      ),
      officeHours: getMoreBlockValue("officeHours"),
      honors: getMoreBlockValue("honors"),
      articles: getMoreBlockValue("articles"),

      social_fb,
      social_twitter,
      social_linkedin,
      social_instagram,
      scrapeUrl: window.location.href,
      scrapePieces,
      description,
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

  let companyNameClean = fileNameClean(companyDetails.companyName);
  let stateNameClean = fileNameClean(companyDetails.state).toLowerCase();
  let cityNameClean = fileNameClean(companyDetails.city).toLowerCase();

  let jsonFile = `json/law-firms/${stateNameClean}/${cityNameClean}/${companyNameClean}.json`;
  console.log(`which should be written to: ${jsonFile}`);

  //DIRECTORY CHECK/WRITE
  let dirs = [
    "json",
    "json/law-firms",
    `json/law-firms/${stateNameClean}`,
    `json/law-firms/${stateNameClean}/${cityNameClean}`,
  ];
  for (let i = 0; i < dirs.length; i++) {
    if (!fs.existsSync(dirs[i])) {
      fs.mkdirSync(dirs[i]);
    }
  }

  //END

  delete companyDetails.scrapePieces;
  let data = JSON.stringify(companyDetails, null, 4);
  fs.writeFileSync(jsonFile, data);
};
*/

const grabFullDetail = async (url) => {
  //

  let updateDetailIndex = fullDetailsArr.map((o) => o.profileUrl).indexOf(url);
  let updateDetailEl = fullDetailsArr[updateDetailIndex];

  console.log(`attempt grabFullDetail for: ${url}`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url);
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

    const getRowDetailByLabel = (searchText = "") => {
      var nodes = document.querySelectorAll("#mProfile .row");
      for (let i = 0; i < nodes.length; i++) {
        let rowNode = nodes[i];
        if (rowNode.children[0].innerText === searchText) {
          var htmlStr = rowNode.children[1].innerText;
          //cleanse
          return htmlStr;
          break;
        }
      }

      return "unknown";
    };
    /*

    let cleanAddressSegments = document.querySelector("p.pp_card_street");
    let segLen = cleanAddressSegments.childElementCount;
    let address1 = getInnerTextValue(
      cleanAddressSegments.querySelector("span.pp_card_street:nth-of-type(1)")
    );

    let address2 = getInnerTextValue(
      cleanAddressSegments.querySelector("span.pp_card_street:nth-of-type(2)")
    );

    let city = getInnerTextValue(
      document.querySelector(
        `p.pp_card_street > span:nth-of-type(${segLen - 2})`
      )
    );
    let state = getInnerTextValue(
      document.querySelector(
        `p.pp_card_street > span:nth-of-type(${segLen - 1})`
      )
    );
    state = state.replace(",", "").trim();
    let zip = getInnerTextValue(
      document.querySelector(`p.pp_card_street > span:nth-of-type(${segLen})`)
    );
    let website = "";
    if (document.querySelector("a.listing-desc-button")) {
      website = document
        .querySelector("a.listing-desc-button")
        .getAttribute("href");
      if (website.includes("?")) {
        website = website.split("?")[0];
      }
    }

    let phone = getInnerTextValue(
      document.querySelector(".svg-icon-phone + span")
    );

    let profilePhotoUrl = "";
    if (document.querySelector("img#profile_photo_block")) {
      profilePhotoUrl = document
        .querySelector("img#profile_photo_block")
        .getAttribute("src");
    }

    let tmpEls = document.querySelectorAll(".card.more-info .block_content");
    let moreBlocks = [];
    console.log(`tmpEls len: ${tmpEls.length}`);

    //convert html list to string list separated by a pipe (|)
    const htmlListToStringList = (htmlStr) => {
      let str = htmlStr.trim().replace(/>\s+</g, "><");

      str = str.replaceAll("<ul><li>", "");
      str = str.replaceAll("</li></ul>", "");
      str = str.replaceAll("</li><li>", "|");
      str = str.replaceAll(" |", "|");
      str = str.replaceAll("| ", "|");
      return str.trim();
    };

    //camelize string
    function camelize(str) {
      return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, "");
    }

    var keys = [];

    for (var el of tmpEls) {
      let k = camelize(el.querySelector("h4").innerText);
      if (keys.includes(k)) {
        continue;
      }
      keys.push(k);
      let v = el.querySelector(".block_content_body").innerHTML;
      //moreBlocks[k] = v;
      let tmpObj = {};
      //SKIP PHOTOS
      if (!["photo", "address", "phone", "fax", "email"].includes(k)) {
        //CLEAN LISTS TO STANDARD PIPE SEPARATED
        if (
          [
            "practiceAreas",
            "languages",
            "classesAndSeminars",
            "websites",
          ].includes(k)
        ) {
          v = htmlListToStringList(v);
        }

        if (["offersFreeInitialConsultation"].includes(k)) {
          v = v.replace("<p>Yes</p>", "Yes");
        }

        tmpObj[k] = v;
        moreBlocks.push(tmpObj);
      }
    }

    let fax = getInnerTextValue(document.querySelector(".pplus_firm_fax"));

    //SOCIAL LINKS
    let social_fb = "";
    let social_twitter = "";
    let social_linkedin = "";
    let social_instagram = "";

    const getMoreBlockValue = (k) => {
      for (let i = 0; i < moreBlocks.length; i++) {
        let obj = moreBlocks[i];

        if (k in obj) {
          return obj[k];
        }
      }
      return "";
    };

    const getScrapePlacementDetails = (str) => {
      let pieces = str.split("/");
      return { name: pieces[5], state: pieces[6], city: pieces[7] };
    };
    const scrapePieces = getScrapePlacementDetails(window.location.href);

    let description = "";
    if (document.querySelector("div#pp_overview_text")) {
      description = document.querySelector("div#pp_overview_text").innerHTML;
    }
    */

    var barNum = getRowDetailByLabel("Bar Number:");

    return {
      fullName: document.querySelector("h1.full").innerText,
      barNum,
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

  //DIRECTORY CHECK/WRITE
  let dirs = ["json", "json/fl-bar"];

  for (let i = 0; i < dirs.length; i++) {
    if (!fs.existsSync(dirs[i])) {
      fs.mkdirSync(dirs[i]);
    }
  }

  let jsonFile = `${dirs[1]}/test.json`;
  console.log(`which should be written to: ${jsonFile}`);

  //END

  //delete companyDetails.scrapePieces;
  let data = JSON.stringify(companyDetails, null, 4);
  fs.writeFileSync(jsonFile, data);
};

///BOTTOM IS WORKING BUT TEMPORARILY DISABLED
//setup scrape detail then comment out once completed
grabFullDetail(
  "https://www.floridabar.org/directories/find-mbr/profile/?num=92228"
);

/*
//PERFORM THE DUTIES
scrapeListingslUrl(baseUrl).then((value) => {
  fullDetailsArr = value;
  console.log(value);
  console.log("Collection length: " + value.length);
  console.log(value[0]);
  console.log(value[value.length - 1]);
  
  //GET THE UNIQUE PROFILE LINKS
  const unique = [...new Set(value.map((item) => item.profileUrl))];
  console.log(`unique profileUrls: ${unique.length}`);

  for (let i = 0; i < unique.length; i++) {
    setTimeout(() => {
      grabFullDetail(unique[i]);
    }, i * 750);
  }
  
});
*/
