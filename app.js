const express = require('express').
      bodyParser = require('body-parser'),
      mongoose = require("mongoose"),
      { schoolModel, studentModel } = require('../student_data/models');
      axios = require('axios');

const app = express();
const PORT = 3100;
app.use(bodyParser.json());

const dbUrl = "mongodb://localhost:27017/student_data";
mongoose.connect(dbUrl);

app.get('/', (_, res) => {
    res.send('Welcome to Student Data Application');
});

app.post('/registerSchool', async (req, res) => {
    const data = req.body;
    const index = await schoolModel.find().count();
    const schoolDetails = new schoolModel({
        schoolName: data.schoolName,
        schoolId: index + 1,

    });
    let schoolData = await schoolDetails.save();
    res.send({
        result: schoolData
    });
});

app.post('/addWebhookEvent', async (req, res) => {
    const data = req.body;
    let schoolDetails = await schoolModel.findOne({ "schoolId": data.schoolId });
    if (schoolDetails) {
        if (schoolDetails.webhookDetails == null) {
            schoolDetails.webhookDetails = [];
        }
        schoolDetails.webhookDetails.push({
            eventName: data.eventName,
            endpointUrl: data.endpointUrl
        });

        schoolDetails = await schoolModel.findOneAndUpdate(
            { "schoolId": schoolDetails.schoolId }, schoolDetails, {
            returnOriginal: false
        })
    } else {
        console.log("NO school")
    }
    res.send({
        result: schoolDetails
    });
});

app.post('/addStudent', async (req, res) => {
    const { name, age, schoolId } = req.body;
    let studentData = {};
    let schoolDetails = await schoolModel.findOne({ schoolId });
    if (schoolDetails) {
        const studentDetails = new studentModel({
            name,
            age,
            schoolId,
        });
        studentData = await studentDetails.save();
        let webhookUrl = "";
        for (let i = 0; i < schoolDetails.webhookDetails.length; i++) {
            if (schoolDetails.webhookDetails[i].eventName == "newStudentAdd")
                webhookUrl = schoolDetails.webhookDetails[i].endpointUrl;
        }
        if (webhookUrl != null && webhookUrl.length > 0) {
            await axios.post(webhookUrl, studentData, {
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            console.log("webhook data send")
        }
    } else {
        console.log(" NO school")
    }
    res.send({
        result: "added succesfully: " + studentData.name
    });
});


app.listen(PORT, () => {
    console.log(`Server running at: http://localhost:${PORT}/`);
});

mongoose.connection.on('connected', () => {
    console.log('Mongoose default connection open to ' + dbUrl);
})
