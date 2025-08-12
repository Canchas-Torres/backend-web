'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;
const BUCKET_NAME = process.env.RECEIPTS_BUCKET_NAME;

module.exports.handler = async (event) => {
    // Again, in a real app, you'd verify the user is authorized for this booking.

    try {
        const { bookingId, s3Key } = JSON.parse(event.body);

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
