'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

module.exports.confirmBooking = async (event) => {
    const apiKey = event.headers['x-api-key'];
    if (!apiKey || apiKey !== ADMIN_API_KEY) {
        return { statusCode: 403, body: JSON.stringify({ message: 'Forbidden' }) };
    }

    try {
        const { bookingId } = event.pathParameters;

        const params = {
            TableName: BOOKINGS_TABLE,
            Key: { bookingId },
            UpdateExpression: "set bookingStatus = :status",
            ExpressionAttributeValues: {
                ":status": "CONFIRMED",
            },
            ReturnValues: "ALL_NEW",
        };

        const { Attributes } = await docClient.send(new UpdateCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify(Attributes),
        };
    } catch (error) {
        console.error("Error confirming booking:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Could not confirm booking.", error: error.message }),
        };
    }
};
