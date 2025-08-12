'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;

// Helper function to generate all possible slots for a day
const generateAllSlots = (day) => {
    const slots = [];
    // Assuming business hours from 8 AM to 10 PM (22:00)
    for (let hour = 8; hour < 22; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
};

module.exports.checkAvailability = async (event) => {
    const { fieldId, date } = event.queryStringParameters;

    if (!fieldId || !date) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "fieldId and date are required query parameters." }),
        };
    }

    const fieldId_bookingDate = `${fieldId}#${date}`;

    try {
        const params = {
            TableName: BOOKINGS_TABLE,
            IndexName: 'field-availability-index',
            KeyConditionExpression: 'fieldId_bookingDate = :pk',
            ExpressionAttributeValues: {
                ':pk': fieldId_bookingDate,
            },
        };

        const { Items: bookedItems } = await docClient.send(new QueryCommand(params));

        const allSlots = generateAllSlots(date);

        // Filter out slots that are already booked
        const bookedStartTimes = new Set(bookedItems.map(item => item.startTime));
        const availableSlots = allSlots.filter(slot => !bookedStartTimes.has(slot));

        return {
            statusCode: 200,
            body: JSON.stringify({
                fieldId: fieldId,
                date: date,
                availableSlots: availableSlots,
            }),
        };

    } catch (error) {
        console.error("Error checking availability:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Could not check availability.", error: error.message }),
        };
    }
};
