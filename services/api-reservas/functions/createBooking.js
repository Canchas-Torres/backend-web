'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../utils/auth');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;

module.exports.createBooking = async (event) => {
  const decodedToken = verifyToken(event);
  if (!decodedToken) {
    return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
  }

  try {
    const { fieldId, date, startTime } = JSON.parse(event.body);

    if (!fieldId || !date || !startTime) {
      return { statusCode: 400, body: JSON.stringify({ message: "fieldId, date, and startTime are required" }) };
    }

    // Race condition check: ensure the slot hasn't been booked since the user checked availability
    const fieldId_bookingDate = `${fieldId}#${date}`;
    const availabilityCheckParams = {
      TableName: BOOKINGS_TABLE,
      IndexName: 'field-availability-index',
      KeyConditionExpression: 'fieldId_bookingDate = :pk and startTime = :sk',
      ExpressionAttributeValues: {
        ':pk': fieldId_bookingDate,
        ':sk': startTime,
      },
    };
    const { Items: existingBookings } = await docClient.send(new QueryCommand(availabilityCheckParams));
    if (existingBookings.length > 0) {
      return { statusCode: 409, body: JSON.stringify({ message: "This time slot has just been booked. Please select another one." }) };
    }

    // --- If we reach here, the slot is available ---
    const bookingId = uuidv4();
    const userId = decodedToken.userId;
    const createdAt = new Date().toISOString();
    // Assuming 1-hour slots
    const endTime = `${parseInt(startTime.split(':')[0]) + 1}:00`;

    const params = {
      TableName: BOOKINGS_TABLE,
      Item: {
        bookingId: bookingId,
        userId: userId,
        fieldId: fieldId,
        bookingDate: date,
        startTime: startTime,
        endTime: endTime,
        totalPrice: 100, // Placeholder price
        bookingStatus: 'PENDING_PAYMENT',
        paymentReceiptUrl: null,
        createdAt: createdAt,
        fieldId_bookingDate: fieldId_bookingDate, // For the GSI
      },
      // Ensure bookingId is unique, though uuid should guarantee this.
      ConditionExpression: 'attribute_not_exists(bookingId)',
    };

    await docClient.send(new PutCommand(params));

    return {
      statusCode: 201,
      body: JSON.stringify(params.Item),
    };
  } catch (error) {
    console.error("Error creating booking:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Could not create the booking.", error: error.message }),
    };
  }
};
