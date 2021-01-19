// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    AttachmentLayoutTypes,
    ActivityHandler,
    MessageFactory,
    CardFactory,
    ActivityTypes,
    TurnContext  
} = require("botbuilder");
const { ActionTypes } = require("botframework-schema");
const axios = require("axios");

const AdaptiveCard = require("./resources/adaptiveCard.json");
const ShowLogCard = require("./resources/ShowLogCard.json");
const LogResultCard = require("./resources/LogResultCard.json");
const serverCard = require("./resources/serverCard.json");
const HelpCard = require("./resources/HelpCard.json");

const ACT_SHOW_LOG = "ACT_SHOW_LOG";
class EmptyBot extends ActivityHandler {
    constructor(conversationState, userState, dialog, conversationReferences) {
        super();
        if (!conversationState)
            throw new Error(
                "[DialogBot]: Missing parameter. conversationState is required"
            );
        if (!userState)
            throw new Error(
                "[DialogBot]: Missing parameter. userState is required"
            );
        if (!dialog)
            throw new Error(
                "[DialogBot]: Missing parameter. dialog is required"
            );

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty("DialogState");

        this.conversationReferences = conversationReferences;

        this.onConversationUpdate(async (context, next) => {
            this.addConversationReference(context.activity);

            await next();
        });

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
            //訊息推播
            this.addConversationReference(context.activity);

            let input = context.activity.text;            
            const value = context.activity.value;
            const entities = context.activity.entities;

            //處理mention資料
            if (entities) {
                entities.filter(entity => (entity.type === "mention"))
                        .forEach(entity => {
                            input = input.replace(entity.text, "").replace("\\n", "");
                        });
                input = input.trim();
            }

            console.log(input);
            if(value && value.actionId === ACT_SHOW_LOG){
                const reply = { type: ActivityTypes.Message };
                const userInput = {serverName: value.serverName, logLevel: value.logLevel, start: value.startDate + " " + value.startTime, end: value.endDate + " " + value.endTime}
                
                const response = await axios.post("http://demochatops.azurewebsites.net/demo/getLogs", {level: userInput.logLevel, start: userInput.start, end: userInput.end});
                const { data } = response;

                let logResultCard = this.createLogResultCard(userInput);
                let logItemList = [];
                data.forEach((item, i) => {
                    let logContent = {};
                    logContent.title = item.date + " " + item.level + " " + item.className;
                    logContent.text = item.message;                
                    logItemList.push(this.createLogItem(logContent));
                    if((i + 1) % 6 === 0){
                        logResultCard.body.push(this.createActionSet(logItemList));
                        logItemList = [];
                    }
                });
                logResultCard.body.push(this.createActionSet(logItemList));
                

                reply.attachments = [CardFactory.adaptiveCard(logResultCard)];
                reply.attachmentLayout = AttachmentLayoutTypes.Carousel;
                
                await context.sendActivity(reply);
            }

            switch (input) {
                case "#h":
                    // const reply = MessageFactory.text(`您輸入了 ${input}`);
                    // await context.sendActivity(reply);
                    await context.sendActivity({
                        attachments: [this.createHelpCard()],
                    });
                    break;
                case "#ShowServers":
                    let serverCards = await axios.get(
                        "http://demochatops.azurewebsites.net/demo/getServerCards"
                    );

                    let serverCardAttachments = [];
                    for (let i = 0; i < serverCards.data.length; i++) {
                        serverCardAttachments.push(
                            this.createServerCard(serverCards.data[i])
                        );
                    }

                    await context.sendActivity({
                        attachments: serverCardAttachments,
                        attachmentLayout: AttachmentLayoutTypes.Carousel,
                    });

                    break;
                case "#ShowMembers":
                    const memberCards = await axios.get(
                        "http://demochatops.azurewebsites.net/demo/getMemberCards"
                    );

                    let memberCardsAttachments = [];
                    for (let i = 0; i < memberCards.data.length; i++) {
                        memberCardsAttachments.push(
                            this.createMemberCard(memberCards.data[i])
                        );
                    }

                    await context.sendActivity({
                        attachments: memberCardsAttachments,
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
                        attachments: [
                            this.createThumbnailCard(),
                            this.createThumbnailCard(),
                            this.createThumbnailCard(),
                        ],
                        attachmentLayout: AttachmentLayoutTypes.Carousel,
                    });
                    break;
                case "#ShowLogs":
                    await context.sendActivity({
                        attachments: [this.createShowLogCard()],
                    });
                    break;
                case "#d":
                    // 20200114 Dennis.Chen - 試做Dialog
                    // await this.dialog.run(context, this.dialogState);
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

    addConversationReference(activity) {
        // const conversationParameters = {
        //     isGroup: true,
        //     channelData: {
        //         channel: {
        //             id: teamsChannelId
        //         }
        //     }
        // };
        // const connectorClient = context.adapter.createConnectorClient(context.activity.serviceUrl);
        // const conversationResourceResponse = await connectorClient.conversations.createConversation(conversationParameters);

        const conversationReference = TurnContext.getConversationReference(activity);
        this.conversationReferences[conversationReference.conversation.id] = conversationReference;
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

    createHelpCard() {
        return CardFactory.adaptiveCard(HelpCard);
    }

    createLogResultCard(userInput) {
        return {
            type: "AdaptiveCard",
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.2",
            body: [
                {
                    type: "TextBlock",
                    text: "您搜尋的範圍是:",
                    wrap: true,
                    weight: "Bolder",
                    color: "Accent",
                    size: "Large"
                },
                {
                    type: "FactSet",
                    facts: [
                        {
                            title: "Server Name:",
                            value: userInput.serverName
                        },
                        {
                            title: "Log Level:",
                            value: userInput.logLevel
                        },
                        {
                            title: "Start Time:",
                            value: userInput.start
                        },
                        {
                            title: "End Time:",
                            value: userInput.end
                        }
                    ],
                    spacing: "Medium",
                    separator: true,
                    height: "stretch",
                    id: "SHOW_LOG_FACTSET"
                }
            ]   
        };
    }

    createHelpCardBakup() {
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
                    title: '"#servers"',
                    value: "#servers",
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
                    title: '"#ShowMembers"',
                    value: "#ShowMembers",
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

    createServerCard(serverCard) {
        return CardFactory.adaptiveCard({
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            type: "AdaptiveCard",
            version: "1.2",
            body: [
                {
                    type: "Container",
                    items: [
                        {
                            type: "TextBlock",
                            text: serverCard.serverName,
                            size: "extraLarge",
                            wrap: true,
                            weight: "bolder",
                        },
                        {
                            type: "Container",
                            items: [
                                {
                                    type: "TextBlock",
                                    text: " ",
                                    wrap: true,
                                },
                            ],
                        },
                    ],
                },
                {
                    type: "Container",
                    spacing: "None",
                    items: [
                        {
                            type: "ColumnSet",
                            columns: [
                                {
                                    type: "Column",
                                    width: "stretch",
                                    items: [
                                        {
                                            type: "TextBlock",
                                            text: "CPU",
                                            spacing: "None",
                                            wrap: true,
                                            size: "Medium",
                                        },
                                        {
                                            type: "TextBlock",
                                            text: serverCard.cpuText + " %",
                                            color: this.getGradeColor(
                                                serverCard.cpuText
                                            ),
                                            size: "ExtraLarge",
                                            wrap: true,
                                        },
                                    ],
                                },
                                {
                                    type: "Column",
                                    width: "auto",
                                    items: [
                                        {
                                            type: "Image",
                                            url: serverCard.cpuImgUrl,
                                            width: "100px",
                                            height: "100px",
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            type: "ColumnSet",
                            columns: [
                                {
                                    type: "Column",
                                    width: "stretch",
                                    items: [
                                        {
                                            type: "TextBlock",
                                            text: "Memory",
                                            spacing: "None",
                                            wrap: true,
                                            size: "Medium",
                                        },
                                        {
                                            type: "TextBlock",
                                            text: serverCard.memoryText + " %",
                                            color: this.getGradeColor(
                                                serverCard.memoryText
                                            ),
                                            size: "ExtraLarge",
                                            wrap: true,
                                        },
                                    ],
                                },
                                {
                                    type: "Column",
                                    width: "auto",
                                    items: [
                                        {
                                            type: "Image",
                                            url: serverCard.memoryImgUrl,
                                            width: "100px",
                                            height: "100px",
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            type: "ColumnSet",
                            columns: [
                                {
                                    type: "Column",
                                    width: "stretch",
                                    items: [
                                        {
                                            type: "TextBlock",
                                            text: "Storage",
                                            spacing: "None",
                                            wrap: true,
                                            size: "Medium",
                                        },
                                        {
                                            type: "TextBlock",
                                            text: serverCard.storageText + " %",
                                            color: this.getGradeColor(
                                                serverCard.storageText
                                            ),
                                            size: "ExtraLarge",
                                            wrap: true,
                                        },
                                    ],
                                },
                                {
                                    type: "Column",
                                    width: "auto",
                                    items: [
                                        {
                                            type: "Image",
                                            url: serverCard.storageImgUrl,
                                            width: "100px",
                                            height: "100px",
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            type: "ColumnSet",
                            columns: [
                                {
                                    type: "Column",
                                    width: "stretch",
                                    items: [
                                        {
                                            type: "TextBlock",
                                            text: "HTTP Connections",
                                            spacing: "None",
                                            wrap: true,
                                            size: "Medium",
                                        },
                                        {
                                            type: "TextBlock",
                                            text: serverCard.httpConnText,
                                            color: this.getGradeColor(
                                                serverCard.httpConnText
                                            ),
                                            size: "ExtraLarge",
                                            wrap: true,
                                        },
                                    ],
                                },
                                {
                                    type: "Column",
                                    width: "auto",
                                    items: [
                                        {
                                            type: "Image",
                                            url: serverCard.httpConnImgUrl,
                                            width: "100px",
                                            height: "100px",
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            type: "ColumnSet",
                            columns: [
                                {
                                    type: "Column",
                                    width: "stretch",
                                    items: [
                                        {
                                            type: "TextBlock",
                                            text: "Database Connections",
                                            spacing: "None",
                                            wrap: true,
                                            size: "Medium",
                                        },
                                        {
                                            type: "TextBlock",
                                            text: serverCard.dbConnText,
                                            color: this.getGradeColor(
                                                serverCard.dbConnText
                                            ),
                                            size: "ExtraLarge",
                                            wrap: true,
                                        },
                                    ],
                                },
                                {
                                    type: "Column",
                                    width: "auto",
                                    items: [
                                        {
                                            type: "Image",
                                            url: serverCard.dbConnIUrl,
                                            width: "100px",
                                            height: "100px",
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
            actions: [
                {
                    type: "Action.OpenUrl",
                    title: "View Info",
                    url: "http://demochatops.azurewebsites.net/img/pngegg.png",
                    style: "positive",
                },
            ],
        });
    }

    getGradeColor(value) {
        if (value <= 60) {
            return "good";
        } else if (value < 85 && value > 60) {
            return "warning";
        } else {
            return "attention";
        }
    }
    createMemberCard(memberInfo) {
        return CardFactory.adaptiveCard({
            type: "AdaptiveCard",
            body: [
                {
                    type: "ColumnSet",
                    columns: [
                        {
                            type: "Column",
                            items: [
                                {
                                    type: "Image",
                                    url: memberInfo.profileImage,
                                    style: "Person",
                                    width: "80px",
                                    height: "80px",
                                },
                            ],
                            width: "stretch",
                        },
                        {
                            type: "Column",
                            items: [
                                {
                                    type: "TextBlock",
                                    size: "Large",
                                    weight: "Bolder",
                                    text: memberInfo.name,
                                    wrap: true,
                                    horizontalAlignment: "Left",
                                },
                                {
                                    type: "TextBlock",
                                    text: memberInfo.enName,
                                    wrap: true,
                                    horizontalAlignment: "Left",
                                },
                            ],
                            verticalContentAlignment: "Center",
                            width: "stretch",
                        },
                    ],
                },
                {
                    type: "FactSet",
                    facts: [
                        {
                            title: "職位",
                            value: memberInfo.position,
                        },
                        {
                            title: "電話",
                            value: memberInfo.phone,
                        },
                        {
                            title: "E-mail",
                            value: memberInfo.Email,
                        },
                    ],
                },
            ],
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.2",
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

    createLogItem(logContent) {
        return {
            type: "Action.ShowCard",
            title: logContent.title,
            card: {
              type: "AdaptiveCard",
              body: [
                {
                  type: "TextBlock",
                  text: logContent.text,
                  wrap: true
                }
              ]
            }
          }
    }

    createActionSet(logItemList) {
        return {
            type: "ActionSet",
            actions: logItemList
        }
    }
}

module.exports.EmptyBot = EmptyBot;
