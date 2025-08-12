'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const FIELDS_TABLE = 'FieldsTable';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

module.exports.deleteField = async (event) => {
  const apiKey = event.headers['x-api-key'];
  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    return { statusCode: 403, body: JSON.stringify({ message: 'Forbidden' }) };
  }

  try {
    const { fieldId } = event.pathParameters;

    const params = {
      TableName: FIELDS_TABLE,
      Key: { fieldId },
      // Soft delete: en lugar de borrar, marcamos como inactiva
      UpdateExpression: "set isActive = :isActive",
      ExpressionAttributeValues: {
        ":isActive": false,
      },
      ReturnValues: "ALL_NEW",
    };

    await docClient.send(new UpdateCommand(params));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Field deactivated successfully" }),
    };
  } catch (error) {
    console.error("Error deleting field:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Could not deactivate field.", error: error.message }),
    };
  }
};
