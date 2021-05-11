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

const TIMEZONE = '+05:30';

// Get date and time
const getDateTime = (date, time) => {

    let year = date.split('T')[0].split('-')[0];
    let month = date.split('T')[0].split('-')[1];
    let day = date.split('T')[0].split('-')[2];

    let hour = time.split('T')[1].split(':')[0];
    let minute = time.split('T')[1].split(':')[1];

    let newDateTime = `${year}-${month}-${day}T${hour}:${minute}:00.000${TIMEZONE}`;

    let event = new Date(Date.parse(newDateTime));

    let dateTime = event.toLocaleString('en', { timeZone: 'Asia/Kolkata' }).split(',');

    return {
        date: dateTime[0],
        time: dateTime[1].trim()
    }
};

// Zappier Webhook Calls
const axios = require('axios');

const URL = process.env.URL;

// Create new organization
const createData = async (endPoint, fields) => {

    url = `${URL}/${endPoint}/`;
    console.log(`The URL --> ${url}`);
    headers = {
        'Content-Type': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    console.log(`This is the data ${JSON.stringify(fields, 2, ' ')}`);

    try {
        let response = await axios.post(url, JSON.stringify(fields), headers);
        console.log(`This is the response --> ${JSON.stringify(response.data, 2, ' ')}`);
        console.log(`New data create with status --> ${response.data.status}`);
    } catch (error) {
        console.log(`Error at createData --> ${error}`);
    }
};

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

    let outString = `Got that ${first_name}! Are you a new or existing patient?`;

    return utteranceTranscript({
        fulfillmentText: outString,
        queryText: queryText,
        session: session,
        transcript: transcript
    }, false);
};

// Handle userProvidesLeadSource
const userProvidesLeadSource = async (req) => {

    let outputContexts = req.body.queryResult.outputContexts;
    let queryText = req.body.queryResult.queryText;

    let first_name, last_name, phone, email, patient_type, appt_type, transcript;

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            first_name = outputContext.parameters.first_name;
            last_name = outputContext.parameters.last_name;
            phone = outputContext.parameters.phone;
            email = outputContext.parameters.email;
            patient_type = outputContext.parameters.patient_type;
            appt_type = outputContext.parameters.appt_type;
            transcript = outputContext.parameters.transcript;
        }
    });

    let tDate = new Date();

    transcript.push({
        user: `${queryText}\n`,
        SmartBox_Agent: 'Sounds good. Can I help with anything else?\n',
        date: `${tDate.toLocaleString('en', { timeZone: 'Asia/Kolkata' })}\n`
    });

    let newTranscript = [];

    let username = `${first_name}_${last_name}`;

    transcript.forEach(ts => {

        let data = {};
        data[username] = ts.user;
        data['SmartBox_Agent'] = ts.SmartBox_Agent;
        data['date'] = ts.date;

        newTranscript.push(data);
    });

    newTranscript.push({
        first_name: first_name,
        last_name: last_name
    });

    let fields = {
        first_name: first_name,
        last_name: last_name,
        phone: `${phone}`,
        email: email,
        patient_type: patient_type,
        appt_type: appt_type,
        transcript: newTranscript
    };

    if (patient_type === 'Existing Patient') {
        fields['Intent Name'] = 'Existing Patient Appointment Request';
        await createData('ovtl2cp', fields);
    } else {
        fields['Intent Name'] = 'New Patient Appointment Request';
        await createData('ovtlopy', fields);
    }

    return {
        fulfillmentText: 'Sounds good. Can I help with anything else?'
    };
};

// Handle userProvidesLastnameNumberPC
const userProvidesLastnameNumberPC = async (req) => {

    let outputContexts = req.body.queryResult.outputContexts;
    let queryText = req.body.queryResult.queryText;

    let first_name, last_name, phone, patient_type, transcript;

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            first_name = outputContext.parameters.first_name;
            last_name = outputContext.parameters.last_name;
            phone = outputContext.parameters.phone;
            patient_type = outputContext.parameters.patient_type;
            transcript = outputContext.parameters.transcript;
        }
    });

    let tDate = new Date();

    transcript.push({
        user: `${queryText}\n`,
        SmartBox_Agent: 'Sounds good. Can I help with anything else?\n',
        date: `${tDate.toLocaleString('en', { timeZone: 'Asia/Kolkata' })}\n`
    });

    let newTranscript = [];

    let username = `${first_name}_${last_name}`;

    transcript.forEach(ts => {

        let data = {};
        data[username] = ts.user;
        data['SmartBox_Agent'] = ts.SmartBox_Agent;
        data['date'] = ts.date;

        newTranscript.push(data);
    });

    newTranscript.push({
        first_name: first_name,
        last_name: last_name
    });

    let fields = {
        first_name: first_name,
        last_name: last_name,
        phone: `${phone}`,
        patient_type: patient_type,
        transcript: newTranscript
    };

    if (patient_type === 'Existing Patient') {
        fields['Intent Name'] = 'Existing Patient Callback Request';
        await createData('ovtqvw5', fields);
    } else {
        fields['Intent Name'] = 'New Patient Callback Request';
        await createData('ovtloyr', fields);
    }

    let session = req.body.session;
    let awaitFirstnamePC = `${session}/contexts/await-pc-first-name`;

    return {
        fulfillmentText: 'Sounds good. Can I help with anything else?',
        outputContexts: [{
            name: awaitFirstnamePC,
            lifespanCount: 0
        }]
    };
};

// Handle userProvideFirstnamePC
const userProvideFirstnamePC = async (req) => {

    let outputContexts = req.body.queryResult.outputContexts;
    let queryText = req.body.queryResult.queryText;
    let session = req.body.session;

    let first_name, last_name, phone;
    let transcript;

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            first_name = outputContext.parameters.first_name;
            last_name = outputContext.parameters.last_name;
            phone = outputContext.parameters.phone;
            transcript = outputContext.parameters.transcript;
        }
    });

    let outString = '';

    if (first_name === undefined) {
        outString += `Great! I just need your contact information and have our patient coordinator call you. Before we start please tell me your name.`;
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false);
    } else  if (last_name == undefined && phone === undefined) {
        outString += `May I please have your last name and phone number for correspondence?`;
        let awaitLP = `${session}/contexts/await-pc-lastname-number`;
        let oc = [{
            name: awaitLP,
            lifespanCount: 2
        }];

        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else {
        let responseData = await userProvidesLastnameNumberPC(req);
        return responseData;
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
        outString += `I'm Lisa, the virtual assistant for ABC Dental. To get started, what is your first name?`;
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
        outString += `Thanks ${first_name}! May I help you schedule an appointment today?`;
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
        outString += `Sure, I can help you with that. To get started, what is your first name?`;
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
    } else {
        outString += `Sure ${first_name}! I can help you with that. What type of appointment do you need?`;
        let awaitAT = `${session}/contexts/await-appointment-type`;
        let awaitFirstnameD = `${session}/contexts/await-first-name-d`;
        let oc = [{
            name: awaitAT,
            lifespanCount: 1
        }, {
            name: awaitFirstnameD,
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

// Handle checkLastnameNumberUPPType
const checkLastnameNumberUPPType = (req) => {

    let outputContexts = req.body.queryResult.outputContexts;
    let queryText = req.body.queryResult.queryText;
    let session = req.body.session;

    let last_name, phone;
    let transcript = [];

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            if (outputContext.hasOwnProperty('parameters')) {
                last_name = outputContext.parameters.last_name;
                phone = outputContext.parameters.phone
                transcript = outputContext.parameters.transcript; 
            }
        }
    });

    let outString = '';

    if (last_name === undefined && phone === undefined) {
        outString += `May I please have your last name and phone number to begin?`;
        let awaitLastnameNumber = `${session}/contexts/await-lastname-number`;
        let awaitEmail = `${session}/contexts/await-email`;
        let oc = [{
            name: awaitLastnameNumber,
            lifespanCount: 2
        }, {
            name: awaitEmail,
            lifespanCount: 0
        }];
        return utteranceTranscript({
            fulfillmentText: outString,
            queryText: queryText,
            session: session,
            transcript: transcript
        }, false, oc);
    } else {
        outString += `Thank you! May I also have your email for correspondence?`;
        let awaitEmail = `${session}/contexts/await-email`;
        let awaitLastnameNumber = `${session}/contexts/await-lastname-number`;
        let oc = [{
            name: awaitEmail,
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



// Webhook route
webApp.post('/webhook', async (req, res) => {

    let action = req.body.queryResult.action;
    console.log('Webhook called');
    console.log(action);

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