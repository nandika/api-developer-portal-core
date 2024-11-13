const path = require("path");
const fs = require("fs");
const exphbs = require("express-handlebars");
const config = require("../config/config");
const markdown = require("marked");
const orgDao = require("../dao/organization");
const apiDao = require("../dao/apiMetadata");
const devportalConstants = require("../utils/contstants");

let filePrefix = "../../../../src/";

const registerPartials = async (req, res, next) => {
  const orgName = req.originalUrl.split("/")[1];
  let baseURL = "/" + orgName;
  let filePath = req.originalUrl.split("/" + orgName).pop();
  if (config.mode === devportalConstants.DEV_MODE) {
    filePath = req.originalUrl.split(baseURL).pop();
  }
  if (config.mode === devportalConstants.DEV_MODE) {
    registerPartialsFromFile(baseURL, path.join(__dirname, filePrefix, "partials"), req.user);
    registerPartialsFromFile(baseURL, path.join(__dirname, filePrefix, "pages", "home", "partials"), req.user);
    registerPartialsFromFile(baseURL, path.join(__dirname, filePrefix, "pages", "api-landing", "partials"), req.user);
    registerPartialsFromFile(baseURL, path.join(__dirname, filePrefix, "pages", "apis", "partials"), req.user);
    if (fs.existsSync(path.join(__dirname, filePrefix + "pages", filePath, "partials"))) {
      registerPartialsFromFile(baseURL, path.join(__dirname, filePrefix + "pages", filePath, "partials"), req.user);
    }
  } else {
    await registerPartialsFromAPI(req);
  }
  next();
};

const registerPartialsFromAPI = async (req) => {
  const orgName = req.params.orgName;
  let organization = await orgDao.getOrgID(orgName);
  let orgID = organization.ORG_ID;
  let apiID = "";
  const apiName = req.params.apiName;
  if (apiName) {
    apiID = await apiDao.getAPIId(apiName);
  }
  const url = config.adminAPI + "orgFileType?orgName=" + orgName + "&fileType=partials";
  const imageUrl = config.adminAPI + "orgFiles?orgName=" + orgName;

  //attach partials
  const partialsResponse = await fetch(url);
  let partials = await partialsResponse.json();
  let partialObject = {};
  partials.forEach((file) => {
    let fileName = file.pageName.split(".")[0];
    let content = file.pageContent;
    content = content.replaceAll(devportalConstants.IMAGES_PATH, imageUrl + devportalConstants.FILE_NAME_PARAM);
    partialObject[fileName] = content;
  });
  const hbs = exphbs.create({});
  hbs.handlebars.partials = partialObject;

  Object.keys(partialObject).forEach((partialName) => {
    hbs.handlebars.registerPartial(partialName, partialObject[partialName]);
  });

  hbs.handlebars.partials = {
    ...hbs.handlebars.partials,
    header: hbs.handlebars.compile(partialObject[devportalConstants.HEADER_PARTIAL_NAME])({
      baseUrl: "/" + orgName,
      profile: req.user,
    }),
    [devportalConstants.HERO_PARTIAL_NAME]: hbs.handlebars.compile(partialObject[devportalConstants.HERO_PARTIAL_NAME])(
      { baseUrl: "/" + orgName }
    ),
  };
  if (req.originalUrl.includes(devportalConstants.API_LANDING_PAGE_PATH)) {
    //fetch markdown content for API if exists
    let markdownResponse = await apiDao.getAPIFile(devportalConstants.API_MD_CONTENT_FILE_NAME, orgID, apiID);
    let markdownContent = markdownResponse.API_FILE.toString("utf8");
    const markdownHtml = markdownContent ? markdown.parse(markdownContent) : "";

    //if hbs content available for API, render the hbs page
    let additionalAPIContentResponse = await apiDao.getAPIFile(
      devportalConstants.API_HBS_CONTENT_FILE_NAME,
      orgID,
      apiID
    );
    let additionalAPIContent = additionalAPIContentResponse.API_FILE.toString("utf8");
    partialObject[devportalConstants.API_CONTENT_PARTIAL_NAME] = additionalAPIContent ? additionalAPIContent : "";
    hbs.handlebars.partials[devportalConstants.API_CONTENT_PARTIAL_NAME] = hbs.handlebars.compile(
      partialObject[devportalConstants.API_CONTENT_PARTIAL_NAME]
    )({ content: markdownHtml });
  }
};

function registerPartialsFromFile(baseURL, dir, profile) {
  const hbs = exphbs.create({});
  const filenames = fs.readdirSync(dir);
  filenames.forEach((filename) => {
    if (filename.endsWith(".hbs")) {
      let template = fs.readFileSync(path.join(dir, filename), "utf8");
      hbs.handlebars.registerPartial(filename.split(".hbs")[0], template);
      if (filename == "header.hbs") {
        hbs.handlebars.partials = {
          ...hbs.handlebars.partials,
          header: hbs.handlebars.compile(template)({
            baseUrl: baseURL,
            profile: profile,
          }),
        };
      }
    }
  });
}

module.exports = registerPartials;
