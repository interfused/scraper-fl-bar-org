const puppeteer = require("puppeteer");
const baseScrapeURL = `https://lawyers.findlaw.com/lawyer/firm/medical-malpractice`;

let browser = puppeteer.Browser;

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
  console.log(`final items are`);
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
    console.log(`ready to scrape ${baseSelector} `);

    const finalItems = [];

    const lawFirms = await page.evaluate((baseSelector) => {
      console.log(`attempt to scrape ${baseSelector}`);
      const locations = document.querySelectorAll(baseSelector);

      console.log(`locations len: ${locations.length}`);

      const firmLocations = Array.from(locations).map((el) => {
        const company = el.querySelector("h2.listing-details-header");
        const profileLink = el.querySelector("a.directory_profile");

        return {
          company: company.textContent,
          profileLink: profileLink.textContent,
        };
      });
      return firmLocations;
    });
    return lawFirms;
  } catch (error) {
    console.log(`error with processing`);
    console.log(error);
    await browser.close();
    return {};
  }
  //return `state was ${locState} and city was ${locCity}`;
};

main();
