const path = require('path');
const fs = require('fs');
const exphbs = require('express-handlebars');
const config = require('../config/config');
const markdown = require('marked');

var filePrefix = '../../../../src/';

const registerPartials = async (req, res, next) => {

    const orgName = req.originalUrl.split("/")[1];
    const filePath = req.originalUrl.split("/" + orgName).pop();
    if (config.mode == 'single') {
        registerPartialsFromFile(orgName, path.join(__dirname, filePrefix, 'partials'), req.user);
        registerPartialsFromFile(orgName, path.join(__dirname, filePrefix, 'pages', 'home', 'partials'), req.user);
        registerPartialsFromFile(orgName, path.join(__dirname, filePrefix, 'pages', 'api-landing', 'partials'), req.user);
        registerPartialsFromFile(orgName, path.join(__dirname, filePrefix, 'pages', 'apis', 'partials'), req.user);
        if (fs.existsSync(path.join(__dirname, filePrefix + 'pages', filePath, 'partials'))) {
            registerPartialsFromFile(orgName, path.join(__dirname, filePrefix + 'pages', filePath, 'partials'), req.user);
        }
    } else if (config.mode == 'multi') {
        await registerPartialsFromAPI(req)
    }
    next()
}

const registerPartialsFromAPI = async (req) => {

    const orgName = req.originalUrl.split("/")[1];
    const apiName = req.originalUrl.split("/").pop();
    const url = config.adminAPI + "orgFileType?orgName=" + orgName + "&fileType=partials";
    const imageUrl = config.adminAPI + "orgFiles?orgName=" + orgName;
    const apiContetnUrl = config.apiMetaDataAPI + "apiFiles?orgName=" + orgName + "&apiID=" + apiName;

    //attach partials
    const partialsResponse = await fetch(url);
    var partials = await partialsResponse.json();

    var partialObject = {}
    partials.forEach(file => {
        var fileName = file.pageName.split(".")[0];
        var content = file.pageContent;
        content = content.replaceAll("/images/", imageUrl + "&fileName=")
        partialObject[fileName] = content;
    });

    const markdownResponse = await fetch(apiContetnUrl + "&fileName=apiContent.md");
    const markdownContent = await markdownResponse.text();
    const markdownHtml = markdownContent ? markdown.parse(markdownContent) : '';

    const additionalAPIContentResponse = await fetch(apiContetnUrl + "&fileName=api-content.hbs");
    const additionalAPIContent = await additionalAPIContentResponse.text();
    partialObject["api-content"] = additionalAPIContent;

    const hbs = exphbs.create({});
    hbs.handlebars.partials = partialObject;

    Object.keys(partialObject).forEach(partialName => {
        hbs.handlebars.registerPartial(partialName, partialObject[partialName]);
    });

    hbs.handlebars.partials = {
        ...hbs.handlebars.partials,
        header: hbs.handlebars.compile(partialObject['header'])({ baseUrl: '/' + req.originalUrl.split("/")[1], profile: req.user }),
        "api-content": hbs.handlebars.compile(partialObject['api-content'])({ content: markdownHtml }),
        "hero": hbs.handlebars.compile(partialObject['hero'])({ baseUrl: '/' + req.originalUrl.split("/")[1] })
    };
}

function registerPartialsFromFile(orgName, dir, profile) {

    const hbs = exphbs.create({});
    const filenames = fs.readdirSync(dir);
    filenames.forEach((filename) => {
        if (filename.endsWith('.hbs')) {
            var template = fs.readFileSync(path.join(dir, filename), 'utf8');
            hbs.handlebars.registerPartial(filename.split(".hbs")[0], template);
            if (filename == "header.hbs") {
                hbs.handlebars.partials = {
                    ...hbs.handlebars.partials,
                    header: hbs.handlebars.compile(template)({ baseUrl: '/' + orgName, profile: profile }),
                };
            }
        }
    });
};

module.exports = registerPartials;
