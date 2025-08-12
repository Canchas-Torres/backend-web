'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const FIELDS_TABLE = 'FieldsTable';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

module.exports.createField = async (event) => {
  const apiKey = event.headers['x-api-key'];
  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
  }

  try {
    const { name, type, pricePerHour, photoUrls, location } = JSON.parse(event.body);

    if (!name || !type || !pricePerHour) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Fields 'name', 'type', and 'pricePerHour' are required" }),
      };
    }

    const fieldId = uuidv4();
    const createdAt = new Date().toISOString();

    const params = {
      TableName: FIELDS_TABLE,
      Item: {
        fieldId: fieldId,
        name: name,
        type: type,
        pricePerHour: pricePerHour,
        photoUrls: photoUrls || [],
        location: location || {},
        isActive: true,
        createdAt: createdAt,
      },
    };

    await docClient.send(new PutCommand(params));

    return {
      statusCode: 201,
      body: JSON.stringify(params.Item),
    };
  } catch (error) {
    console.error("Error creating field:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Could not create the field.", error: error.message }),
    };
  }
};
