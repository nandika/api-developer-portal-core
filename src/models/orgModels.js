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
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Organization = sequelize.define('DP_ORGANIZATION', {
    ORG_ID: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    ORG_NAME: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    BUSINESS_OWNER: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }, 
    BUSINESS_OWNER_CONTACT: {
        type: DataTypes.STRING,
        allowNull: true
    },
    BUSINESS_OWNER_EMAIL: {
        type: DataTypes.STRING,
        allowNull: true
    },
}, {
    timestamps: false,
    tableName: 'DP_ORGANIZATION',
    returning: true
});

const OrgContent = sequelize.define('DP_ORGANIZATION_ASSETS', {
    ASSERT_ID: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    FILE_NAME: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    FILE_CONTENT: {
        type: DataTypes.BLOB,
        allowNull: false,
    },
    FILE_TYPE: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    FILE_PATH: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    ORG_ID: {
        type: DataTypes.UUID,
        allowNull: false,
        forignKey: true,
    }
}, {
    timestamps: false,
    tableName: 'DP_ORGANIZATION_ASSETS'
},{
    indexes: [
        {
            unique: true,
            fields: ['FILE_TYPE', 'FILE_NAME', 'FILE_PATH', 'ORG_ID'] 
        }
    ]
});

OrgContent.belongsTo(Organization, {
    foreignKey: 'ORG_ID',
});

Organization.hasMany(OrgContent, {
    foreignKey: 'ORG_ID',
    onDelete: 'CASCADE',
});

// Export both models
module.exports = {
    Organization,
    OrgContent
};
