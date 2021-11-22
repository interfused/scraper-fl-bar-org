const puppeteer = require("puppeteer");
const fs = require("fs");

let scrape = async (locCity, locState) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  var isNextPageExists = true;

  await page.goto(
    `https://lawyers.findlaw.com/lawyer/firm/medical-malpractice/${locCity.toLowerCase()}/${locState.toLowerCase()}`
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
};

scrape("ORLANDO", "FLORIDA").then((value) => {
  console.log(value);
  console.log("Collection length: " + value.length);
  console.log(value[0]);
  console.log(value[value.length - 1]);

  //GET THE UNIQUE PROFILE LINKS
  const unique = [...new Set(value.map((item) => item.profileUrl))];
  console.log(`unique profileUrls: ${unique.length}`);

  for (let i = 0; i < 1; i++) {
    grabFullDetail(unique[i]);
  }
});
