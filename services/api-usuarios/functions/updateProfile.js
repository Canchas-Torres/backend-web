'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { verifyToken } = require('../utils/auth');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const USERS_TABLE = 'UsersTable';

module.exports.updateProfile = async (event) => {
  const decodedToken = verifyToken(event);
  if (!decodedToken) {
    return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
  }

  try {
    const { name } = JSON.parse(event.body);
    if (!name) {
        return { statusCode: 400, body: JSON.stringify({ message: "Name is required for update" }) };
    }

    const params = {
      TableName: USERS_TABLE,
      Key: { userId: decodedToken.userId },
      UpdateExpression: 'set #name = :name',
      ExpressionAttributeNames: { '#name': 'name' },
      ExpressionAttributeValues: { ':name': name },
      ReturnValues: 'ALL_NEW',
    };

    const { Attributes } = await docClient.send(new UpdateCommand(params));
    delete Attributes.password;

    return {
      statusCode: 200,
      body: JSON.stringify(Attributes),
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Could not update profile." }) };
  }
};
