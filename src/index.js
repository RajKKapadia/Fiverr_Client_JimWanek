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

// Handle userProvidesAppointmentType
const userProvidesAppointmentType = (req) => {

    let outputContexts = req.body.queryResult.outputContexts;

    let first_name;

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            first_name = outputContext.parameters.first_name;
        }
    });

    let response = `Thanks ${first_name}! Are you a new or existing patient?`;

    return response;
};

// Get date and time
const getDateTime = (date, time) => {

    let year = date.split('T')[0].split('-')[0];
    let month = date.split('T')[0].split('-')[1];
    let day = date.split('T')[0].split('-')[2];

    let hour = time.split('T')[1].split(':')[0];
    let minute = time.split('T')[1].split(':')[1];

    let newDateTime = `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;

    let event = new Date(Date.parse(newDateTime));

    let dateTime = event.toLocaleString('en').split(',');

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

    url = `${URL}/${endPoint}`;
    headers = {
        'Content-Type': 'application/json'
    };

    try {
        let response = await axios.get(url, headers, fields);
        console.log(`New data create with status --> ${response.data.status}`);
    } catch (error) {
        console.log(`Error at createNewOrganization --> ${error}`);
    }
};

// Handle userProvidesLeadSource
const userProvidesLeadSource = async (req) => {

    let outputContexts = req.body.queryResult.outputContexts;

    let first_name, last_name, phone, email, patient_type, lead_source, appt_type, appt_date, appt_time;

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
        }
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
        appt_time: datetime.time
    };

    if (patient_type === 'Existing Patient') {
        await createData('ovtl2cp', fields);
    } else {
        await createData('ovtlopy', fields);
    }

    return 'Sounds good. Can I help with anything else?';
};

// Handle userProvidesLastnameNumberPC
const userProvidesLastnameNumberPC = async (req) => {

    let outputContexts = req.body.queryResult.outputContexts;

    let first_name, last_name, phone, patient_type;

    outputContexts.forEach(outputContext => {
        let session = outputContext.name;
        if (session.includes('/contexts/session')) {
            first_name = outputContext.parameters.first_name;
            last_name = outputContext.parameters.last_name;
            phone = outputContext.parameters.phone;
            patient_type = outputContext.parameters.patient_type;
        }
    });

    let fields = {
        first_name: first_name,
        last_name: last_name,
        phone: `${phone}`,
        patient_type: patient_type
    };

    if (patient_type === 'Existing Patient') {
        await createData('ovtqvw5', fields);
    } else {
        await createData('ovtloyr', fields);
    }

    return 'Sounds good. Can I help with anything else?';
};

// Webhook route
webApp.post('/webhook', async (req, res) => {

    let action = req.body.queryResult.action;
    console.log('Webhook called');
    console.log(action);

    let response = '';

    if (action === 'userProvidesAppointmentType') {
        response += userProvidesAppointmentType(req);
    } else if (action === 'userProvidesLeadSource') {
        response += await userProvidesLeadSource(req);
    } else if (action === 'userProvidesLastnameNumberPC') {
        response += await userProvidesLastnameNumberPC(req);
    } else {
        response += 'No action is set for this intent.'
    }

    res.send({
        fulfillmentText: response
    });
});

// Start the server
webApp.listen(PORT, () => {
    console.log(`Server is up and running at ${PORT}`);
});