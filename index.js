const puppeteer = require("puppeteer");
const { resourceLimits } = require("worker_threads");
const baseScrapeURL = `https://lawyers.findlaw.com/lawyer/firm/medical-malpractice`;

let browser = puppeteer.Browser;

const finalItems = [];

const main = async () => {
  //BASIC CONSOLE LOG
  const s = "asdf";
  console.log(s);

  //SETUP BROWSER
  browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      height: 1020,
      width: 1080,
    },
  });

  const items = await scrapeData("FLORIDA", "ORLANDO");
  console.log(`final items have length ${items.length} and detail are`);
  console.dir(items);
};

const scrapeData = async (locState, locCity) => {
  const page = await browser.newPage();
  const search = `https://lawyers.findlaw.com/lawyer/firm/medical-malpractice/${locCity.toLowerCase()}/${locState.toLowerCase()}`;
  console.log(`attempt to go to ${search}`);
  const baseSelector = `.serp_result`;

  try {
    await page.goto(`${search}`);

    // wait for input field selector to render
    await page.waitForSelector(baseSelector);
    console.log(` scrape ${baseSelector} `);

    const lawFirmProfileUrls = await page.evaluate(() => {
      let baseSelector = `.serp_result`;
      let results = [];

      let items = document.querySelectorAll(baseSelector);
      items.forEach((item) => {
        let profileWrapper = item.querySelector("a.directory_profile");
        if (profileWrapper) {
          //results.push(profileWrapper);
          results.push({
            company: item.querySelector("h2.listing-details-header").innerText,
            url: profileWrapper.getAttribute("href"),
          });
        }
      });
      return results;
    });

    return lawFirmProfileUrls;
  } catch (error) {
    console.log(`error with processing`);
    console.log(error);
    await browser.close();
    return {};
  }
  //return `state was ${locState} and city was ${locCity}`;
};

main();
