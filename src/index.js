// external packages
const { response } = require('express');
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
        user: queryText,
        SmartBox_Agent: fulfillmentText,
        date: date.toLocaleString('en', { timeZone: 'Asia/Kolkata' })
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

    let outString = `Thanks ${first_name}! Are you a new or existing patient?`;

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

    let first_name, last_name, phone, email, patient_type, lead_source, appt_type, appt_date, appt_time, transcript;

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            first_name = outputContext.parameters.first_name;
            last_name = outputContext.parameters.last_name;
            phone = outputContext.parameters.phone;
            email = outputContext.parameters.email;
            patient_type = outputContext.parameters.patient_type;
            lead_source = outputContext.parameters.lead_source;
            appt_type = outputContext.parameters.appt_type;
            appt_date = outputContext.parameters.appt_date;
            appt_time = outputContext.parameters.appt_time;
            transcript = outputContext.parameters.transcript;
        }
    });

    let tDate = new Date();

    transcript.push({
        user: queryText,
        SmartBox_Agent: 'Sounds good. Can I help with anything else?',
        date: tDate.toLocaleString('en', { timeZone: 'Asia/Kolkata' })
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

    let datetime = getDateTime(appt_date, appt_time);

    let fields = {
        first_name: first_name,
        last_name: last_name,
        phone: `${phone}`,
        email: email,
        patient_type: patient_type,
        lead_source: lead_source,
        appt_type: appt_type,
        appt_date: datetime.date,
        appt_time: datetime.time,
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
        user: queryText,
        SmartBox_Agent: 'Sounds good. Can I help with anything else?',
        date: tDate.toLocaleString('en', { timeZone: 'Asia/Kolkata' })
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

    return {
        fulfillmentText: 'Sounds good. Can I help with anything else?'
    };
};

// Handle userProvideFirstnamePC
const userProvideFirstnamePC = (req) => {

    let outputContexts = req.body.queryResult.outputContexts;
    let queryText = req.body.queryResult.queryText;
    let session = req.body.session;

    let first_name = '';
    let transcript;

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            first_name = outputContext.parameters.first_name;
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
    } else {
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
    }
};

// Webhook route
webApp.post('/webhook', async (req, res) => {

    let action = req.body.queryResult.action;
    console.log('Webhook called');
    console.log(action);

    let response = {};

    if (action === 'userProvidesAppointmentType') {
        response = userProvidesAppointmentType(req);
    } else if (action === 'userProvidesLeadSource') {
        response = await userProvidesLeadSource(req);
    } else if (action === 'userProvidesLastnameNumberPC') {
        response = await userProvidesLastnameNumberPC(req);
    } else if (action === 'utteranceTranscript') {
        response = utteranceTranscript(req, true);
    } else if (action === 'userProvideFirstnamePC') {
        response = userProvideFirstnamePC(req);
    } else {
        response = {
            fulfillmentText: 'No action is set for this intent.'
        };
    }

    res.send(response);
});

// Start the server
webApp.listen(PORT, () => {
    console.log(`Server is up and running at ${PORT}`);
});