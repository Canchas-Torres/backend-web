'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { verifyToken } = require('../utils/auth');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const FIELDS_TABLE = 'FieldsTable';
const USERS_TABLE = process.env.USERS_TABLE;

module.exports.deleteField = async (event) => {
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
