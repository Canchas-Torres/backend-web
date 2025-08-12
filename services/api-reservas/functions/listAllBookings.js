'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

module.exports.listAllBookings = async (event) => {
    const apiKey = event.headers['x-api-key'];
    if (!apiKey || apiKey !== ADMIN_API_KEY) {
        return { statusCode: 403, body: JSON.stringify({ message: 'Forbidden' }) };
    }

    const { bookingStatus } = event.queryStringParameters || {};
    if (!bookingStatus) {
        return { statusCode: 400, body: JSON.stringify({ message: "bookingStatus query parameter is required" }) };
    }

    try {
        const params = {
            TableName: BOOKINGS_TABLE,
            IndexName: 'status-date-index',
            KeyConditionExpression: 'bookingStatus = :status',
            ExpressionAttributeValues: {
                ':status': bookingStatus,
            },
        };

        const { Items } = await docClient.send(new QueryCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify(Items),
        };
    } catch (error) {
        console.error("Error listing all bookings:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Could not retrieve bookings.", error: error.message }),
        };
    }
};
