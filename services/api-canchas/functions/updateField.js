'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const FIELDS_TABLE = 'FieldsTable';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

module.exports.updateField = async (event) => {
  const apiKey = event.headers['x-api-key'];
  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    return { statusCode: 403, body: JSON.stringify({ message: 'Forbidden' }) };
  }

  try {
    const { fieldId } = event.pathParameters;
    const { name, type, pricePerHour } = JSON.parse(event.body);

    if (!name || !type || !pricePerHour) {
      return { statusCode: 400, body: JSON.stringify({ message: "Name, type, and pricePerHour are required" })};
    }

    const params = {
      TableName: FIELDS_TABLE,
      Key: { fieldId },
      UpdateExpression: "set #name = :name, #type = :type, pricePerHour = :pricePerHour",
      ExpressionAttributeNames: {
        '#name': 'name',
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ":name": name,
        ":type": type,
        ":pricePerHour": pricePerHour,
      },
      ReturnValues: "ALL_NEW",
    };

    const { Attributes } = await docClient.send(new UpdateCommand(params));
    return {
      statusCode: 200,
      body: JSON.stringify(Attributes),
    };
  } catch (error) {
    console.error("Error updating field:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Could not update field.", error: error.message }),
    };
  }
};
