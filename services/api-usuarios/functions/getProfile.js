'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { verifyToken } = require('../utils/auth');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const USERS_TABLE = 'UsersTable';

module.exports.getProfile = async (event) => {
  const decodedToken = verifyToken(event);
  if (!decodedToken) {
    return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
  }

  try {
    const params = {
      TableName: USERS_TABLE,
      Key: { userId: decodedToken.userId },
    };

    const { Item } = await docClient.send(new GetCommand(params));

    if (!Item) {
      return { statusCode: 404, body: JSON.stringify({ message: "User not found" }) };
    }

    delete Item.password; // Never return the password hash

    return {
      statusCode: 200,
      body: JSON.stringify(Item),
    };
  } catch (error) {
    console.error("Error getting profile:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Could not retrieve profile." }) };
  }
};
