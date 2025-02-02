/*
 * Copyright (c) 2024, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
/* eslint-disable no-undef */
const { renderTemplate, renderTemplateFromAPI, renderGivenTemplate, loadLayoutFromAPI, loadMarkdown } = require('../utils/util');
const config = require(process.cwd() + '/config.json');
const fs = require('fs');
const path = require('path');
const exphbs = require('express-handlebars');
const constants = require('../utils/constants');
const adminDao = require('../dao/admin');
const apiDao = require('../dao/apiMetadata');
const apiMetadataService = require('../services/apiMetadataService');

const filePrefix = config.pathToContent;
const generateArray = (length) => Array.from({ length });

const loadAPIs = async (req, res) => {

    const orgName = req.params.orgName;
    let html;
    if (config.mode === constants.DEV_MODE) {
        const templateContent = {
            apiMetadata: await loadAPIMetaDataList(),
            baseUrl: constants.BASE_URL + config.port
        };
        html = renderTemplate(filePrefix + 'pages/apis/page.hbs', filePrefix + 'layout/main.hbs', templateContent);
    } else {
        try {
            const organization = await adminDao.getOrganization(orgName);
            const orgID = organization.ORG_ID;
            const metaData = await loadAPIMetaDataListFromAPI(req, orgID, orgName);
            const templateContent = {
                apiMetadata: metaData,
                baseUrl: '/' + orgName
            };
            html = await renderTemplateFromAPI(templateContent, orgID, orgName, "pages/apis");
        } catch (error) {
            console.error(`Error while loading organization content ,${error}`);
            console.log("Rendering default api listing page from file");
            const templateContent = {
                baseUrl: constants.BASE_URL + config.port
            };
            html = renderTemplate(filePrefix + 'pages/apis/page.hbs', filePrefix + 'layout/main.hbs', templateContent);
        }
    }
    res.send(html);
}

const loadAPIContent = async (req, res) => {

    let html;
    const hbs = exphbs.create({});
    const { orgName, apiName } = req.params;

    if (config.mode === constants.DEV_MODE) {
        const metaData = loadAPIMetaDataFromFile(apiName);
        const filePath = path.join(process.cwd(), filePrefix + '../mock', req.params.apiName + "/" + constants.FILE_NAME.API_HBS_CONTENT_FILE_NAME);
        if (fs.existsSync(filePath)) {
            hbs.handlebars.registerPartial('api-content', fs.readFileSync(filePath, constants.CHARSET_UTF8));
        }
        const templateContent = {
            apiContent: await loadMarkdown(constants.FILE_NAME.API_MD_CONTENT_FILE_NAME, filePrefix + '../mock/' + req.params.apiName),
            apiMetadata: metaData,
            baseUrl: constants.BASE_URL + config.port,
            schemaUrl: orgName + '/mock/' + apiName + '/apiDefinition.xml'
        };
        html = renderTemplate(filePrefix + 'pages/api-landing/page.hbs', filePrefix + 'layout/main.hbs', templateContent);
    } else {
        try {
            const organization = await adminDao.getOrganization(orgName);
            const orgID = organization.ORG_ID;
            const apiID = await apiDao.getAPIId(apiName);
            const metaData = await loadAPIMetaData(req, orgID, apiID);

            const templateContent = {
                apiMetadata: metaData,
                baseUrl: '/' + orgName,
                schemaUrl: `${req.protocol}://${req.get('host')}${constants.ROUTE.DEVPORTAL_ASSETS_BASE_PATH}${orgID}/${constants.ROUTE.API_FILE_PATH}${apiID}${constants.API_TEMPLATE_FILE_NAME}${constants.FILE_NAME.API_DEFINITION_XML}`
            };
            html = await renderTemplateFromAPI(templateContent, orgID, orgName, "pages/api-landing");
        } catch (error) {
            console.error(`Failed to load api content: ,${error}`);
            html = "An error occurred while loading the API content.";
        }
    }
    res.send(html);
}

const loadTryOutPage = async (req, res) => {

    const { orgName, apiName } = req.params;
    let html = "";
    if (config.mode === constants.DEV_MODE) {
        const metaData = loadAPIMetaDataFromFile(apiName);
        let apiDefinition = path.join(process.cwd(), filePrefix + '../mock', req.params.apiName + '/apiDefinition.json');
        if (fs.existsSync(apiDefinition)) {
            apiDefinition = await fs.readFileSync(apiDefinition, constants.CHARSET_UTF8);
        }
        const templateContent = {
            apiMetadata: metaData,
            baseUrl: constants.BASE_URL + config.port,
            apiType: metaData.apiInfo.apiType,
            swagger: apiDefinition
        };
        html = renderTemplate('../pages/tryout/page.hbs', filePrefix + 'layout/main.hbs', templateContent);
    } else {
        try {
            const organization = await adminDao.getOrganization(orgName);
            const orgID = organization.ORG_ID;
            const apiID = await apiDao.getAPIId(apiName);
            const metaData = await loadAPIMetaData(req, orgID, apiID);
            let apiDefinition = await apiDao.getAPIFile(constants.FILE_NAME.API_DEFINITION_FILE_NAME, orgID, apiID);
            apiDefinition = apiDefinition.API_FILE.toString(constants.CHARSET_UTF8);
            const templateContent = {
                apiMetadata: metaData,
                baseUrl: req.params.orgName,
                apiType: metaData.apiInfo.apiType,
                swagger: apiDefinition
            };
            const completeTemplatePath = path.join(require.main.filename, '..', 'pages', 'tryout', 'page.hbs');
            const templateResponse = fs.readFileSync(completeTemplatePath, constants.CHARSET_UTF8);
            const layoutResponse = await loadLayoutFromAPI(orgID);
            html = await renderGivenTemplate(templateResponse, layoutResponse, templateContent);
        } catch (error) {
            console.error(`Failed to load api tryout : ,${error}`);
        }
    }
    res.send(html);
}

async function loadAPIMetaDataList() {

    const mockAPIMetaDataPath = path.join(process.cwd(), filePrefix + '../mock', 'apiMetadata.json');
    let mockAPIMetaData = JSON.parse(fs.readFileSync(mockAPIMetaDataPath, 'utf-8'));
    mockAPIMetaData.forEach(element => {
        const randomNumber = Math.floor(Math.random() * 3) + 3;
        element.apiInfo.ratings = generateArray(randomNumber);
        element.apiInfo.ratingsNoFill = generateArray(5 - randomNumber);
    });
    return mockAPIMetaData;
}



async function loadAPIMetaDataListFromAPI(req, orgID, orgName) {

    let metaData = await apiMetadataService.getMetadataListFromDB(orgID);
    metaData.forEach(item => {
        item.baseUrl = '/' + orgName;
    });
    metaData.forEach(element => {
        const randomNumber = Math.floor(Math.random() * 3) + 3;
        element.apiInfo.ratings = generateArray(randomNumber);
        element.apiInfo.ratingsNoFill = generateArray(5 - randomNumber);
        const images = element.apiInfo.apiImageMetadata;
        let apiImageUrl = '';
        for (const key in images) {
            apiImageUrl = `${req.protocol}://${req.get('host')}${constants.ROUTE.DEVPORTAL_ASSETS_BASE_PATH}${orgID}${constants.ROUTE.API_FILE_PATH}${element.apiID}${constants.API_TEMPLATE_FILE_NAME}`;
            const modifiedApiImageURL = apiImageUrl + images[key];
            element.apiInfo.apiImageMetadata[key] = modifiedApiImageURL;
        }
    });
    let data = JSON.stringify(metaData);
    return JSON.parse(data);
}

async function loadAPIMetaData(req, orgID, apiID) {

    let metaData = {};
    metaData = await apiMetadataService.getMetadataFromDB(orgID, apiID);
    const data = metaData ? JSON.stringify(metaData) : {};
    metaData = JSON.parse(data);
    //replace image urls
    let images = metaData.apiInfo.apiImageMetadata;
    for (const key in images) {
        let apiImageUrl = `${req.protocol}://${req.get('host')}${constants.ROUTE.DEVPORTAL_ASSETS_BASE_PATH}${orgID}${constants.ROUTE.API_FILE_PATH}${apiID}${constants.API_TEMPLATE_FILE_NAME}`
        const modifiedApiImageURL = apiImageUrl + images[key]
        images[key] = modifiedApiImageURL;
    }
    return metaData;
}

function loadAPIMetaDataFromFile(apiName) {

    const mockAPIDataPath = path.join(process.cwd(), filePrefix + '../mock', apiName + '/apiMetadata.json');
    return JSON.parse(fs.readFileSync(mockAPIDataPath, constants.CHARSET_UTF8));
}


module.exports = {
    loadAPIs,
    loadAPIContent,
    loadTryOutPage,
};
