'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const FIELDS_TABLE = 'FieldsTable';

module.exports.getField = async (event) => {
  try {
    const { fieldId } = event.pathParameters;
    const params = {
      TableName: FIELDS_TABLE,
      Key: { fieldId },
    };
    const { Item } = await docClient.send(new GetCommand(params));
    if (Item) {
      return {
        statusCode: 200,
        body: JSON.stringify(Item),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Field not found" }),
      };
    }
  } catch (error) {
    console.error("Error getting field:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Could not get field.", error: error.message }),
    };
  }
};
