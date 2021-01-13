// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { AttachmentLayoutTypes, ActivityHandler, MessageFactory, CardFactory } = require('botbuilder');
const { ActionTypes } = require('botframework-schema');
const axios = require('axios');

const AdaptiveCard = require('./resources/adaptiveCard.json');

class EmptyBot extends ActivityHandler {
    constructor() {
        super();
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity('嗨您好，若有疑問請輸入指令\"#h\"查詢');
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMessage(async (context, next) => {
            const text = context.activity.text;

            // If the `text` is in the Array, a valid color was selected and send agreement.
            if (text === '#h') {
                const reply = MessageFactory.text(`您輸入了 ${ text }`);
                await context.sendActivity(reply);
                await context.sendActivity({ attachments: [this.helpCard()] });
            } else if(text === '#api'){
                const response = await axios.get('http://demochatops.azurewebsites.net/demo/getTestMessage');
                const { data } = response;
                await context.sendActivity('API Result: ' + data.message);
            } else if(text === "#cards"){
                await context.sendActivity({ attachments: [this.createAdaptiveCard(), 
                                                           this.createThumbnailCard(), 
                                                           this.createThumbnailCard()], 
                                                           attachmentLayout: AttachmentLayoutTypes.Carousel });
            } else if(text === "#cards2"){
                await context.sendActivity({ attachments: [this.createThumbnailCard(), 
                                                           this.createThumbnailCard(), 
                                                           this.createThumbnailCard()], 
                                                           attachmentLayout: AttachmentLayoutTypes.Carousel });
            } else if(text === "#ask"){
                await this.sendSuggestedActions(context);
            } else{
                await context.sendActivity('請輸入正確指令，可透過「#Help」查詢');                
            }

            // After the bot has responded send the suggested actions.
            // await this.sendSuggestedActions(context);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        
    }

    helpCard() {
        return CardFactory.adaptiveCard(
            {
                "$schema": "https://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.0",
                "actions": [
                  {
                    "type": "Action.Submit",
                    "title": "\"#card\"",
                    "data": {
                        "msteams": {
                            "type": "imBack",
                            "value": "#cards"
                        }
                    }
                  },
                  {
                    "type": "Action.Submit",
                    "title": "\"#card2\"",
                    "data": {
                        "msteams": {
                            "type": "imBack",
                            "value": "#cards2"
                        }
                    }
                  },
                  {
                    "type": "Action.Submit",
                    "title": "\"#api\"",
                    "data": {
                        "msteams": {
                            "type": "imBack",
                            "value": "#api"
                        }
                    }
                  },
                  {
                    "type": "Action.Submit",
                    "title": "\"#ask\"",
                    "data": {
                        "msteams": {
                            "type": "imBack",
                            "value": "#ask"
                        }
                    }
                  }
                ]
            }
        );
    }

    createAdaptiveCard() {
        return CardFactory.adaptiveCard(AdaptiveCard);
    }

    createThumbnailCard() {
        return CardFactory.thumbnailCard(
            'BotFramework Thumbnail Card',
            [{ url: 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbotframework_960.jpg' }],
            [{
                type: 'openUrl',
                title: 'Get started',
                value: 'https://docs.microsoft.com/en-us/azure/bot-service/'
            }],
            {
                subtitle: 'Your bots — wherever your users are talking.',
                text: 'Build and connect intelligent bots to interact with your users naturally wherever they are, from text/sms to Skype, Slack, Office 365 mail and other popular services.'
            }
        );
    }

    async sendSuggestedActions(turnContext) {
        const cardActions = [
            {
                type: ActionTypes.PostBack,
                title: '#card',
                value: '#card',
                image: 'https://via.placeholder.com/20/FF0000?text=R',
                imageAltText: '#card'
            },
            {
                type: ActionTypes.PostBack,
                title: 'Yellow',
                value: 'Yellow',
                image: 'https://via.placeholder.com/20/FFFF00?text=Y',
                imageAltText: 'Y'
            },
            {
                type: ActionTypes.PostBack,
                title: 'Blue',
                value: 'Blue',
                image: 'https://via.placeholder.com/20/0000FF?text=B',
                imageAltText: 'B'
            }
        ];

        var reply = MessageFactory.suggestedActions(cardActions, 'What is the best color?');
        await turnContext.sendActivity(reply);
    }
}

module.exports.EmptyBot = EmptyBot;
