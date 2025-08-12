'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { verifyToken } = require('../utils/auth');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;

module.exports.listMyBookings = async (event) => {
    const decodedToken = verifyToken(event);
    if (!decodedToken) {
        return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    try {
        const params = {
            TableName: BOOKINGS_TABLE,
            IndexName: 'user-bookings-index',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': decodedToken.userId,
            },
            // Optional: to sort from newest to oldest
            ScanIndexForward: false,
        };

        const { Items } = await docClient.send(new QueryCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify(Items),
        };
    } catch (error) {
        console.error("Error listing user bookings:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Could not retrieve user bookings.", error: error.message }),
        };
    }
};
