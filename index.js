const puppeteer = require("puppeteer");
const fs = require("fs");

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
  var lastPageNumber = 2; // this is hardcoded last catalogue page, you can set it dunamically if you wish
  // defined simple loop to iterate over number of catalogue pages
  while (isNextPageExists) {
    // wait 1 sec for page load
    await page.waitForSelector(".serp_result");
    // call and wait extractedEvaluateCall and concatenate results every iteration.
    // You can use results.push, but will get collection of collections at the end of iteration
    results = results.concat(await extractedEvaluateCall(page));
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

async function extractedEvaluateCall(page) {
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
      cleanUrl = cleanUrl.replace(
        "//lawyers.findlaw.com",
        "lawyers.findlaw.com"
      );

      return `https://${cleanUrl}`;
    };

    let data = [];
    let elements = document.querySelectorAll(".serp_result");

    for (var element of elements) {
      let companySelector = element.querySelector("h2.listing-details-header");
      if (companySelector) {
        let company = companySelector.innerText;
        let profileUrl = element
          .querySelector("a.directory_profile")
          .getAttribute("href");

        data.push({ company, profileUrl: cleanProtocol(profileUrl) });
      }
    }

    return data;
  });
}

async function getIfNextPageExists(page) {
  // just extracted same exact logic in separate function
  // this function should use async keyword in order to work and take page as argument
  return page.evaluate(() => {
    let element = document.querySelector('li.pagination-next a[rel="next"]');

    if (element) {
      return true;
    }

    return false;
  });
}

const grabFullDetail = async (url) => {
  console.log(`attempt grabFullDetail for: ${url}`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url);
  //wait for overview text
  await page.waitForSelector("#pp_overview_text");

  //click the toggle to expose full description
  await page.click("a#read_more_toggle");

  const companyDetails = await page.evaluate(() => {
    let cleanAddressSegments = document.querySelector("p.pp_card_street");
    let address1 = cleanAddressSegments
      .querySelector("span.pp_card_street:nth-of-type(1)")
      .innerText.trim();
    let address2 = "";
    if (
      cleanAddressSegments.querySelector("span.pp_card_street:nth-of-type(2)")
    ) {
      address2 = cleanAddressSegments
        .querySelector("span.pp_card_street:nth-of-type(2)")
        .innerText.trim();
    }

    let city = cleanAddressSegments
      .querySelector("span:nth-of-type(3)")
      .innerText.trim();
    let state = cleanAddressSegments.querySelector(
      "span:nth-of-type(4)"
    ).innerText;
    state = state.replace(",", "").trim();
    let zip = cleanAddressSegments
      .querySelector("span:nth-of-type(5)")
      .innerText.trim();
    let website = document
      .querySelector("a.listing-desc-button")
      .getAttribute("href");
    if (website.includes("?")) {
      website = website.split("?")[0];
    }

    let phone = "";
    if (document.querySelector(".svg-icon-phone + span")) {
      phone = document.querySelector(".svg-icon-phone + span").innerText;
    }

    let profilePhotoUrl = document
      .querySelector("img#profile_photo_block")
      .getAttribute("src");

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

    let fax = "";
    if (document.querySelector(".pplus_firm_fax")) {
      fax = document.querySelector(".pplus_firm_fax").innerText;
    }

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
      description: document.querySelector("div#pp_overview_text").innerHTML,
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

///BOTTOM IS WORKING BUT TEMPORARILY DISABLED

scrape("Suffolk County", "CALIFORNIA").then((value) => {
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
    }, i * 600);
  }
});
