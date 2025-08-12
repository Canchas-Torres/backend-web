'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const FIELDS_TABLE = 'FieldsTable';

module.exports.listFields = async (event) => {
  try {
    const params = {
      TableName: FIELDS_TABLE,
    };
    const { Items } = await docClient.send(new ScanCommand(params));
    return {
      statusCode: 200,
      body: JSON.stringify(Items),
    };
  } catch (error) {
    console.error("Error listing fields:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Could not list fields.", error: error.message }),
    };
  }
};
