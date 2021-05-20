// external packages
const express = require('express');
require('dotenv').config();

// Start the webapp
const webApp = express();

// Webapp settings
webApp.use(express.urlencoded({
    extended: true
}));
webApp.use(express.json());

// Server Port
const PORT = process.env.PORT || 5000;

// Home route
webApp.get('/', (req, res) => {
    res.send(`Hello World.!`);
});

// create utterance transcript
const utteranceTranscript = (req, flag, oc = '') => {

    let fulfillmentText = '';
    let queryText = '';
    let transcript = [];
    let session = '';

    if (flag) {
        fulfillmentText += req.body.queryResult.fulfillmentText;
        queryText += req.body.queryResult.queryText;

        session += req.body.session;

        let outputContexts = req.body.queryResult.outputContexts;

        outputContexts.forEach(outputContext => {
            let session = outputContext.name;
            if (session.includes('/contexts/session')) {
                if (outputContext.hasOwnProperty('parameters')) {
                    if (outputContext.parameters.hasOwnProperty('transcript')) {
                        transcript = outputContext.parameters.transcript;
                    }
                }
            }
        });
    } else {
        fulfillmentText += req.fulfillmentText;
        queryText += req.queryText;
        session += req.session;
        transcript = req.transcript;
    }

    let date = new Date();

    transcript.push({
        user: `${queryText}\n`,
        SmartBox_Agent: `${fulfillmentText}\n`,
        date: `${date.toLocaleString('en', { timeZone: 'Asia/Kolkata' })}\n`
    });

    let contextName = `${session}/contexts/session`;

    if (oc === '') {
        return {
            fulfillmentText: fulfillmentText,
            outputContexts: [{
                name: contextName,
                lifespanCount: 50,
                parameters: {
                    transcript: transcript
                }
            }]
        };
    } else {
        let outputContext = [];
        outputContext.push({
            name: contextName,
            lifespanCount: 50,
            parameters: {
                transcript: transcript
            }
        });
        oc.forEach(out => {
            outputContext.push(out);
        });
        return {
            fulfillmentText: fulfillmentText,
            outputContexts: outputContext
        };
    }
};

// Handle userProvidesAppointmentType
const userProvidesAppointmentType = (req) => {

    let outputContexts = req.body.queryResult.outputContexts;
    let queryText = req.body.queryResult.queryText;
    let session = req.body.session;

    let first_name, transcript;

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            first_name = outputContext.parameters.first_name;
            transcript = outputContext.parameters.transcript;
        }
    });

    let outString = `Thanks ${first_name}! ::next-1000::When was your last see a dentist?<button type="button" class"quick_reply">6 months</button><button type="button" class"quick_reply">1 year</button><button type="button" class"quick_reply">More than a year</button>`;

    let awaitLastVisit = `${session}/contexts/await-last-visit`;
    let oc = [{
        name: awaitLastVisit,
        lifespanCount: 1
    }];

    return utteranceTranscript({
        fulfillmentText: outString,
        queryText: queryText,
        session: session,
        transcript: transcript
    }, false, oc);
};

// Handle checkLastnameNumberUPPType
const checkLastnameNumberUPPType = (req) => {

    let outputContexts = req.body.queryResult.outputContexts;
    let queryText = req.body.queryResult.queryText;
    let session = req.body.session;

    let last_name, phone, patient_type;
    let transcript = [];

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            if (outputContext.hasOwnProperty('parameters')) {
                last_name = outputContext.parameters.last_name;
                phone = outputContext.parameters.phone
                transcript = outputContext.parameters.transcript;
                patient_type = outputContext.parameters.patient_type;
            }
        }
    });

    let outString = '';

    if (last_name === undefined && phone === undefined) {
        outString += `To get started, what is your last name?`;
        let awaitLastname = `${session}/contexts/await-lastname`;

        let oc = [{
            name: awaitLastname,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else {
        outString += `Thank you! ::next-1000:: We can confirm your appointment by email.::next-1000::What is your email address?`;
        let awaitLastnameNumber = `${session}/contexts/await-lastname-number`;
        let patientTypeContext = `${session}/contexts/`
        // Set patient type context
        if (patient_type === 'Existing Patient') {
            patientTypeContext += 'existing-patient-email';
        } else {
            patientTypeContext += 'new-patient-email'
        }
        let oc = [{
            name: patientTypeContext,
            lifespanCount: 1
        }, {
            name: awaitLastnameNumber,
            lifespanCount: 0
        }];

        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    }
};

// Handle userProvideFirstnamePC
const userProvideFirstnamePC = async (req) => {

    let outputContexts = req.body.queryResult.outputContexts;
    let queryText = req.body.queryResult.queryText;
    let session = req.body.session;

    let first_name, last_name, phone, patient_type
    let transcript = [];

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            if (outputContext.hasOwnProperty('parameters')) {
                first_name = outputContext.parameters.first_name;
                last_name = outputContext.parameters.last_name;
                phone = outputContext.parameters.phone;
                patient_type = outputContext.parameters.patient_type;
                transcript = outputContext.parameters.transcript;
            }
        }
    });

    let outString = '';

    if (patient_type === undefined) {
        outString += `Thanks! I'll connect you with our patient coordinator now. ::next-2000::Are you a new or existing patient?<button type="button" class"quick_reply">New Patient</button><button type="button" class"quick_reply">Existing Patient</button>`;
        let awaitPatientTypePC = `${session}/contexts/await-pc-patient-type`;
        let oc = [{
            name: awaitPatientTypePC,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else if (first_name === undefined) {
        outString += `Great! I just need your contact information and have our patient coordinator call you. ::next-2000::Before we start please tell me your first name.`;
        let awaitFirstnamePC = `${session}/contexts/await-pc-first-name`;
        let oc = [{
            name: awaitFirstnamePC,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else if (last_name === undefined) {
        outString += `Great! what is your last name?`;
        let awaitPCLastname = `${session}/contexts/await-pc-lastname`;
        let oc = [{
            name: awaitPCLastname,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else if (phone === undefined) {
        outString += `Thanks ${first_name}! ::next-1000::What is the best number for our patient coordinator to call you?`;
        let patientTypeContext = `${session}/contexts/`
        // Set patient type context
        if (patient_type === 'Existing Patient') {
            patientTypeContext += 'existing-patient-phone';
        } else {
            patientTypeContext += 'new-patient-phone'
        }
        let oc = [{
            name: patientTypeContext,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else {
        outString += `Thank you ${first_name}!::next-1000:: Expect a call from our patient coordinator to schedule your appointment.::next-2000:: Can I help with anything else?<button type="button" class"quick_reply">Disconnect</button>`;
        let patientTypeContext = `${session}/contexts/`;
        let awaitPatientTypePC = `${session}/contexts/await-pc-patient-type`;
        let awaitFirstnamePC = `${session}/contexts/await-pc-first-name`;
        // Set patient type context
        if (patient_type === 'Existing Patient') {
            patientTypeContext += 'existing-patient-phone';
        } else {
            patientTypeContext += 'new-patient-phone'
        }
        let oc = [{
            name: patientTypeContext,
            lifespanCount: 0
        }, {
            name: awaitPatientTypePC,
            lifespanCount: 0
        }, {
            name: awaitFirstnamePC,
            lifespanCount: 0
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    }
};

// Handle checkFirstNameAtDefaultWelcomeIntent
const checkFirstNameAtDefaultWelcomeIntent = (req) => {

    let outputContexts = req.body.queryResult.outputContexts;
    let queryText = req.body.queryResult.queryText;
    let session = req.body.session;

    let first_name;
    let transcript = [];

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            if (outputContext.hasOwnProperty('parameters')) {
                first_name = outputContext.parameters.first_name;
                transcript = outputContext.parameters.transcript;
            }
        }
    });

    let outString = '';

    if (first_name === undefined) {
        outString += `Welcome to <%practice_name%>! I'm <%agent_name%>, the virtual assistant for our practice.::next-2000::I can help answer your questions, schedule an appointment or connect you with our patient coordinator.::next-2000:: To get started, what is your first name?`;
        let awaitFirstname = `${session}/contexts/await-first-name`;
        let oc = [{
            name: awaitFirstname,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else {
        outString += `Thanks ${first_name}!::next-1000:: Can I help you schedule an appointment today?`;
        let awaitAC = `${session}/contexts/await-appointment-confirmatio`;
        let awaitFirstname = `${session}/contexts/await-first-name`;
        let oc = [{
            name: awaitAC,
            lifespanCount: 1
        }, {
            name: awaitFirstname,
            lifespanCount: 0
        }];

        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    }
};

// Handle checkFirstNameUserChoosesAppointment
const checkFirstNameUserChoosesAppointment = (req) => {

    let outputContexts = req.body.queryResult.outputContexts;
    let queryText = req.body.queryResult.queryText;
    let session = req.body.session;

    let first_name, last_name, phone, patient_type, appt_type, duration, email;
    let transcript = [];

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            if (outputContext.hasOwnProperty('parameters')) {
                first_name = outputContext.parameters.first_name;
                last_name = outputContext.parameters.last_name;
                phone = outputContext.parameters.phone;
                patient_type = outputContext.parameters.patient_type;
                appt_type = outputContext.parameters.appt_type;
                duration = outputContext.parameters.duration;
                email = outputContext.parameters.email;
                transcript = outputContext.parameters.transcript;
            }
        }
    });

    let outString = '';

    if (first_name === undefined) {
        outString += `Sure, I can help you with that.::next-2000::To get started, what is your first name?`;
        let awaitFirstnameD = `${session}/contexts/await-first-name-d`;
        let oc = [{
            name: awaitFirstnameD,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else if (appt_type === undefined) {
        outString += `Sounds good. I can help you schedule an appointment at <%practice_name%>.::next-2000:: What type of appointment do you need?<button type="button" class"quick_reply">Exam and Cleaning</button><button type="button" class"quick_reply">Tooth Pain</button><button type="button" class"quick_reply">Emergency</button><button type="button" class"quick_reply">Something Else</button>%disable`;
        let awaitAppointmentType = `${session}/contexts/await-appointment-type`;
        let oc = [{
            name: awaitAppointmentType,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else if (duration === undefined) {
        outString += `Thanks ${first_name}! ::next-1000::When was your last see a dentist?<button type="button" class"quick_reply">6 months</button><button type="button" class"quick_reply">1 year</button><button type="button" class"quick_reply">More than a year</button>`;
        let awaitLastVisit = `${session}/contexts/await-last-visit`;
        let oc = [{
            name: awaitLastVisit,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else if (patient_type === undefined) {
        outString += `Got that ${first_name}! Are you a new or existing patient?`;
        let awaitPatientType = `${session}/contexts/await-patient-type`;
        let oc = [{
            name: awaitPatientType,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else if (last_name === undefined) {
        outString += `May I please have your last name to begin?`;
        let awaitLastname = `${session}/contexts/await-lastname`;
        let oc = [{
            name: awaitLastname,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else if (phone === undefined) {
        outString += `What is the best number to reach you?`;
        let awaitPhone = `${session}/contexts/await-phone`;
        let oc = [{
            name: awaitPhone,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else if (email === undefined) {
        outString += `Thank you! May I also have your email for correspondence?`;
        let patientTypeContext = `${session}/contexts/`
        // Set patient type context
        if (patient_type === 'Existing Patient') {
            patientTypeContext += 'existing-patient-email';
        } else {
            patientTypeContext += 'new-patient-email'
        }
        let oc = [{
            name: patientTypeContext,
            lifespanCount: 1
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else {
        outString += `Sounds good. Expect a call from our patient coordinator to schedule your appointment.::next-2000::Can I help with anything else?<button type="button" class"quick_reply">Disconnect</button>`;
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false);
    }
};

// Webhook route
webApp.post('/webhook', async (req, res) => {

    let action = req.body.queryResult.action;
    let session = req.body.session;
    console.log('Webhook called.');
    console.log(`Action --> ${action}`);
    console.log(`Session --> ${session}`);


    let responseData = {};

    if (action === 'userProvidesAppointmentType') {
        responseData = userProvidesAppointmentType(req);
    } else if (action === 'userProvidesLeadSource') {
        responseData = await userProvidesLeadSource(req);
    } else if (action === 'userProvidesLastnameNumberPC') {
        responseData = await userProvidesLastnameNumberPC(req);
    } else if (action === 'utteranceTranscript') {
        responseData = utteranceTranscript(req, true);
    } else if (action === 'userProvideFirstnamePC') {
        responseData = await userProvideFirstnamePC(req);
    } else if (action === 'checkFirstNameAtDefaultWelcomeIntent') {
        responseData = checkFirstNameAtDefaultWelcomeIntent(req);
    } else if (action === 'checkFirstNameUserChoosesAppointment') {
        responseData = checkFirstNameUserChoosesAppointment(req);
    } else if (action === 'checkLastnameNumberUPPType') {
        responseData = checkLastnameNumberUPPType(req);
    } else if (action === 'checkFirstnameUCPC') {
        responseData = checkFirstnameUCPC(req);
    }
    else {
        responseData = {
            fulfillmentText: 'No action is set for this intent.'
        };
    }

    res.send(responseData);
});

// Start the server
webApp.listen(PORT, () => {
    console.log(`Server is up and running at ${PORT}`);
});