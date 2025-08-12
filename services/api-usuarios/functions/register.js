'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const USERS_TABLE = 'UsersTable';

module.exports.register = async (event) => {
  try {
    const { name, email, password } = JSON.parse(event.body);

    if (!name || !email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Name, email, and password are required" }),
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const createdAt = new Date().toISOString();

    const params = {
      TableName: USERS_TABLE,
      Item: {
        userId: userId,
        name: name,
        email: email,
        password: hashedPassword,
        createdAt: createdAt,
      },
    };

    await docClient.send(new PutCommand(params));

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "User registered successfully",
        userId: userId,
      }),
    };
  } catch (error) {
    console.error("Error registering user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Could not register the user.", error: error.message }),
    };
  }
};
