'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { verifyToken } = require('../utils/auth');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;
const BUCKET_NAME = process.env.RECEIPTS_BUCKET_NAME;

module.exports.handler = async (event) => {
    const decodedToken = verifyToken(event);
    if (!decodedToken) {
        return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    try {
        const { bookingId, s3Key } = JSON.parse(event.body);

        // Authorization Step: Check if the user owns the booking
        const { Item: booking } = await docClient.send(new GetCommand({
            TableName: BOOKINGS_TABLE,
            Key: { bookingId },
        }));

        if (!booking || booking.userId !== decodedToken.userId) {
            return { statusCode: 403, body: JSON.stringify({ message: "Forbidden: You do not own this booking." }) };
        }

        if (!bookingId || !s3Key) {
            return { statusCode: 400, body: JSON.stringify({ message: "bookingId and s3Key are required." }) };
        }

        const receiptUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;

        const params = {
            TableName: BOOKINGS_TABLE,
            Key: { bookingId },
            UpdateExpression: "set bookingStatus = :newStatus, paymentReceiptUrl = :url",
            ConditionExpression: "bookingStatus = :currentStatus",
            ExpressionAttributeValues: {
                ":newStatus": "PENDING_VALIDATION",
                ":url": receiptUrl,
                ":currentStatus": "PENDING_PAYMENT",
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
                body: JSON.stringify({ message: "Booking is not in PENDING_PAYMENT state. It may have been processed already." }),
            };
        }
        console.error("Error processing receipt:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Could not process receipt.", error: error.message }),
        };
    }
};
