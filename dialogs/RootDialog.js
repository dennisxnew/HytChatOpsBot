const { ComponentDialog, DialogSet, DialogTurnStatus, WaterfallDialog } = require('botbuilder-dialogs');
const { ShowLogDialog, SHOWLOG_DIALOG } = require('./ShowLogDialog');
const USER_PROFILE_PROPERTY = 'USER_PROFILE_PROPERTY';

class RootDialog extends ComponentDialog {
    constructor(userState) {
        super('root');
        this.userState = userState;
        this.userProfileAccessor = userState.createProperty(USER_PROFILE_PROPERTY);
        // this.userStateAccessor = userState.createProperty('result');
        
        this.addDialog(new ShowLogDialog());

        this.addDialog(new WaterfallDialog('root', [
            this.startDialog.bind(this),
            this.processResults.bind(this)
        ]));
    }

    async run(context, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(context);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async startDialog(step) {
        return await step.beginDialog(SHOWLOG_DIALOG);
    }

    async processResults(step) {
        // Each "slot" in the SlotFillingDialog is represented by a field in step.result.values.
        // The complex that contain subfields have their own .values field containing the sub-values.
        const values = step.result.values;

        const fullname = values.fullname.values;
        await step.context.sendActivity(`Your name is ${ fullname.first } ${ fullname.last }.`);

        await step.context.sendActivity(`You wear a size ${ values.shoesize } shoes.`);

        const address = values.address.values;
        await step.context.sendActivity(`Your address is: ${ address.street }, ${ address.city } ${ address.zip }`);

        return await step.endDialog();
    }
}

module.exports.RootDialog = RootDialog;