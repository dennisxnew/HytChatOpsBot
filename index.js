// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const restify = require('restify');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter, ConversationState, MemoryStorage, UserState, CardFactory, TurnContext, MessageFactory, ActivityTypes} = require('botbuilder');
const { MicrosoftAppCredentials } = require('botframework-connector');
const conversationReferences = {};
// This bot's main dialog.
const { EmptyBot } = require('./bot');
const { RootDialog } = require('./dialogs/RootDialog');

const memoryStorage = new MemoryStorage();
const userState = new UserState(memoryStorage);
const conversationState = new ConversationState(memoryStorage);
const rootDialog = new RootDialog(userState);

const AlertCard = require("./resources/AlertCard.json");

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
});

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about .bot file its use and bot configuration.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Create the main dialog.
const myBot = new EmptyBot(conversationState, userState, rootDialog, conversationReferences);

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route to main dialog.
        await myBot.run(context);
    });
});

server.get('/api/notify', async (req, res) => {

    //群組推播 - 建立新的對話框(New Thread)
    //20200120 Dennis.Chen - 新增信任ServiceUrl，若不加此段，就會發生機器人重啟後，在沒有用戶接著傳送訊息建立權限的情形下，推播會失敗
    MicrosoftAppCredentials.trustServiceUrl("https://smba.trafficmanager.net/apac/");

    const reply = { type: ActivityTypes.Message };
    reply.attachments = [CardFactory.adaptiveCard(AlertCard)];

    const conversationParameters = {
        isGroup: true,
        channelData: {
            channel: {
                id: "19:21abfafa1e9647f394d8fee5690b1cac@thread.tacv2"
            }
        },
        activity: reply
    };
    const connectorClient = adapter.createConnectorClient("https://smba.trafficmanager.net/apac/");
    const conversationResourceResponse = await connectorClient.conversations.createConversation(conversationParameters);

    //個人推播 
    // for (const conversationReference of Object.values(conversationReferences)) {       
    //     await adapter.continueConversation(conversationReference, async context => {
    //         await context.sendActivity({
    //             attachments: [CardFactory.adaptiveCard(AlertCard)]
    //         });
    //     });
    // }

    res.setHeader('Content-Type', ' application/json');
    res.writeHead(200);
    res.write(JSON.stringify({message: "success"}));
    res.end();
});


