'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { verifyToken } = require('../utils/auth');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const FIELDS_TABLE = 'FieldsTable';
const USERS_TABLE = process.env.USERS_TABLE;

module.exports.updateField = async (event) => {
  const decodedToken = verifyToken(event);
  if (!decodedToken) {
    return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
  }

  try {
    // Verify the caller is an admin
    const { Item: caller } = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId: decodedToken.userId },
    }));

    if (!caller || caller.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ message: "Forbidden: Caller is not an admin." }) };
    }

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
