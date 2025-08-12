'use strict';

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require('uuid');

const client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET_NAME = process.env.RECEIPTS_BUCKET_NAME;

module.exports.handler = async (event) => {
    // In a real app, you'd verify the user is authorized to upload for this booking.
    // For now, we assume any authenticated user can trigger this.

    try {
        const { bookingId, contentType } = JSON.parse(event.body);

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
