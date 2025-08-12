'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { verifyToken } = require('../utils/auth');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const USERS_TABLE = 'UsersTable';

module.exports.setUserRole = async (event) => {
    const decodedToken = verifyToken(event);
    if (!decodedToken) {
        return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    try {
        // Step 1: Verify the caller is an admin
        const callerId = decodedToken.userId;
        const callerParams = {
            TableName: USERS_TABLE,
            Key: { userId: callerId },
        };
        const { Item: caller } = await docClient.send(new GetCommand(callerParams));

        if (!caller || caller.role !== 'admin') {
            return { statusCode: 403, body: JSON.stringify({ message: "Forbidden: Caller is not an admin." }) };
        }

        // Step 2: If caller is an admin, proceed to update the target user's role
        const { userId: targetUserId } = event.pathParameters;
        const { role: newRole } = JSON.parse(event.body);

        if (!newRole || (newRole !== 'admin' && newRole !== 'user')) {
            return { statusCode: 400, body: JSON.stringify({ message: "Invalid role specified. Must be 'admin' or 'user'." }) };
        }

        const targetParams = {
            TableName: USERS_TABLE,
            Key: { userId: targetUserId },
            UpdateExpression: 'set #role = :role',
            ExpressionAttributeNames: { '#role': 'role' },
            ExpressionAttributeValues: { ':role': newRole },
            ReturnValues: 'ALL_NEW',
        };

        const { Attributes } = await docClient.send(new UpdateCommand(targetParams));
        delete Attributes.password;

        return {
            statusCode: 200,
            body: JSON.stringify(Attributes),
        };
    } catch (error) {
        console.error("Error setting user role:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Could not set user role.", error: error.message }),
        };
    }
};
