// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    AttachmentLayoutTypes,
    ActivityHandler,
    MessageFactory,
    CardFactory,
} = require("botbuilder");
const { ActionTypes } = require("botframework-schema");
const axios = require("axios");

const AdaptiveCard = require("./resources/adaptiveCard.json");
const ShowLogCard = require("./resources/ShowLogCard.json");

class EmptyBot extends ActivityHandler {
    constructor(conversationState, userState, dialog) {
        super();
        if (!conversationState) throw new Error('[DialogBot]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[DialogBot]: Missing parameter. userState is required');
        if (!dialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty('DialogState');

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(
                        '嗨您好，若有疑問請輸入指令"#h"查詢'
                    );
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMessage(async (context, next) => {
            const input = context.activity.text;
            console.log(context.activity);
            // await this.dialog.run(context, this.dialogState);
            switch (input) {
                case "#h":
                    const reply = MessageFactory.text(`您輸入了 ${input}`);
                    await context.sendActivity(reply);
                    await context.sendActivity({
                        attachments: [this.createHeroCard()],
                    });
                    break;
                case "#Servers":
                    let serverCards = await axios.get(
                        "http://localhost:8080/demo/getServerCards"
                    );
                    
                    let attachments = [];
                    for (let i = 0; i < serverCards.data.length; i++) {
                        console.log(serverCards.data[i].textBlock);
                        console.log(serverCards.data[i].factSet);
                        attachments.push(this.createServerCard(serverCards.data[i].textBlock, serverCards.data[i].factSet));
                    }

                    await context.sendActivity({
                        attachments: attachments,
                        attachmentLayout: AttachmentLayoutTypes.Carousel,
                    });

                    break;
                case "#api":
                    const response = await axios.get(
                        "http://demochatops.azurewebsites.net/demo/getTestMessage"
                    );
                    const { data } = response;
                    await context.sendActivity("API Result: " + data.message);
                    break;
                case "#cards":
                    await context.sendActivity({
                        attachments: [
                            this.createAdaptiveCard(),
                            this.createThumbnailCard(),
                            this.createThumbnailCard(),
                        ],
                        attachmentLayout: AttachmentLayoutTypes.Carousel,
                    });
                    break;
                case "#cards2":
                    await context.sendActivity({
                        attachments: [this.createThumbnailCard(),
                            this.createThumbnailCard(),
                            this.createThumbnailCard()
                        ],
                        attachmentLayout: AttachmentLayoutTypes.Carousel
                    });
                    break;
                case "#ShowLog":
                    await context.sendActivity({
                        attachments: [this.createShowLogCard()],
                    });
                    break;
                case "#d":
                    await this.dialog.run(context, this.dialogState);
                    break;
                case "#heroCard":
                    await context.sendActivity({
                        attachments: [this.createHeroCard()],
                    });
                    break;
            }

            await next();
        });
    }

    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }

    helpCard() {
        return CardFactory.adaptiveCard({
            $schema: "https://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.0",
            body: [
                {
                    type: "TextBlock",
                    text: "請點擊 **下列按鈕** 執行指令",
                },
            ],
            actions: [
                {
                    type: "Action.Submit",
                    title: '"#cards"',
                    data: {
                        msteams: {
                            type: "imBack",
                            value: "#cards",
                        },
                    },
                },
                {
                    type: "Action.Submit",
                    title: '"#cards2"',
                    data: {
                        msteams: {
                            type: "imBack",
                            value: "#cards2",
                        },
                    },
                },
                {
                    type: "Action.Submit",
                    title: '"#api"',
                    data: {
                        msteams: {
                            type: "imBack",
                            value: "#api",
                        },
                    },
                },
            ],
        });
    }

    createAdaptiveCard() {
        return CardFactory.adaptiveCard(AdaptiveCard);
    }

    createShowLogCard() {
        return CardFactory.adaptiveCard(ShowLogCard);
    }

    createHeroCard() {
        return CardFactory.heroCard(
            "請點擊下列按鈕執行指令",
            CardFactory.images([
                "http://demochatops.azurewebsites.net/img/chat-bot.png",
            ]),
            CardFactory.actions([
                {
                    type: "imBack",
                    title: '"#h"',
                    value: "#h",
                },
                {
                    type: "imBack",
                    title: '"#cards"',
                    value: "#cards",
                },
                {
                    type: "imBack",
                    title: '"#cards2"',
                    value: "#cards2",
                },
                {
                    type: "imBack",
                    title: '"#api"',
                    value: "#api",
                },
                {
                    type: "imBack",
                    title: '"#ShowLog"',
                    value: "#ShowLog",
                },
            ])
        );
    }

    createThumbnailCard() {
        return CardFactory.thumbnailCard(
            "BotFramework Thumbnail Card",
            [
                {
                    url:
                        "https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbotframework_960.jpg",
                },
            ],
            [
                {
                    type: "openUrl",
                    title: "Get started",
                    value:
                        "https://docs.microsoft.com/en-us/azure/bot-service/",
                },
            ],
            {
                subtitle: "Your bots — wherever your users are talking.",
                text:
                    "Build and connect intelligent bots to interact with your users naturally wherever they are, from text/sms to Skype, Slack, Office 365 mail and other popular services.",
            }
        );
    }

    createServerCard(textBlock, factset) {
        return CardFactory.adaptiveCard({
            $schema: "https://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.0",
            body: [textBlock, factset],
            actions: [],
        });
    }

    async sendSuggestedActions(turnContext) {
        const cardActions = [
            {
                type: ActionTypes.PostBack,
                title: "#card",
                value: "#card",
                image: "https://via.placeholder.com/20/FF0000?text=R",
                imageAltText: "#card",
            },
            {
                type: ActionTypes.PostBack,
                title: "Yellow",
                value: "Yellow",
                image: "https://via.placeholder.com/20/FFFF00?text=Y",
                imageAltText: "Y",
            },
            {
                type: ActionTypes.PostBack,
                title: "Blue",
                value: "Blue",
                image: "https://via.placeholder.com/20/0000FF?text=B",
                imageAltText: "B",
            },
        ];

        var reply = MessageFactory.suggestedActions(
            cardActions,
            "What is the best color?"
        );
        await turnContext.sendActivity(reply);
    }
}

module.exports.EmptyBot = EmptyBot;
