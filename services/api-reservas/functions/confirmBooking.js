'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { verifyToken } = require('../utils/auth');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

module.exports.confirmBooking = async (event) => {
    // Authenticate the user with JWT
    const decodedToken = verifyToken(event);
    if (!decodedToken) {
        return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    try {
        // Authorize based on user role
        const { Item: user } = await docClient.send(new GetCommand({
            TableName: USERS_TABLE,
            Key: { userId: decodedToken.userId },
        }));

        if (!user || user.role !== 'ADMIN') {
            return { statusCode: 403, body: JSON.stringify({ message: "Forbidden: Admins only." }) };
        }

        const { bookingId } = event.pathParameters;

        const params = {
            TableName: BOOKINGS_TABLE,
            Key: { bookingId },
            UpdateExpression: "set bookingStatus = :newStatus",
            ConditionExpression: "bookingStatus = :currentStatus",
            ExpressionAttributeValues: {
                ":newStatus": "CONFIRMED",
                ":currentStatus": "PENDING",
            },
            ReturnValues: "ALL_NEW",
        };

        const { Attributes } = await docClient.send(new UpdateCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify(Attributes),
        };
    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 409,
                body: JSON.stringify({ message: "Booking could not be confirmed. It may not be in PENDING status." }),
            };
        }
        console.error("Error confirming booking:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Could not confirm booking.", error: error.message }),
        };
    }
};
