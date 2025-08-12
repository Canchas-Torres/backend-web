'use strict';

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require('uuid');
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { verifyToken } = require('../utils/auth');

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const BUCKET_NAME = process.env.RECEIPTS_BUCKET_NAME;
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;

module.exports.handler = async (event) => {
    const decodedToken = verifyToken(event);
    if (!decodedToken) {
        return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    try {
        const { bookingId, contentType } = JSON.parse(event.body);

        // Authorization Step: Check if the user owns the booking
        const { Item: booking } = await docClient.send(new GetCommand({
            TableName: BOOKINGS_TABLE,
            Key: { bookingId },
        }));

        if (!booking || booking.userId !== decodedToken.userId) {
            return { statusCode: 403, body: JSON.stringify({ message: "Forbidden: You do not own this booking." }) };
        }

        if (!bookingId || !contentType) {
            return { statusCode: 400, body: JSON.stringify({ message: "bookingId and contentType are required." }) };
        }

        const receiptId = uuidv4();
        const s3Key = `receipts/${bookingId}/${receiptId}.${contentType.split('/')[1] || 'jpg'}`;

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(client, command, { expiresIn: 300 }); // URL valid for 5 minutes

        return {
            statusCode: 200,
            body: JSON.stringify({
                uploadUrl: signedUrl,
                s3Key: s3Key,
            }),
        };
    } catch (error) {
        console.error("Error generating signed URL:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Could not generate upload URL.", error: error.message }),
        };
    }
};
