const heatmap = require('./heatmap');
const wptutils = require('./wpt-utils');
const express = require('express');
const path = require('path');

const bodyParser = require('body-parser');
const compression = require('compression');
const url = require('url');

const defaultServer = 'www.webpagetest.org';

/*
wptutils.createHeatmap("180220_R9_9f8c3a8e7cb713dc79141645f3e1e313",path.join('public','tests')).then(()=>{
    console.log("Complete",testIds[i]);
});
*/

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(compression())

app.use(express.static('public'))

let port = 3123;

const errMsg = {"status": "ERROR"};

app.listen(port, () => {
    app.get('/locations', (req,res) => {
        let server = (req.query.server?req.query.server:defaultServer);
        wptutils.getLocations(server).then((locations) => {
            res.json(locations);
        })
    })
    app.get('/status', (req, res) => {
        console.log(req.query);
        server = (req.query.server?req.query.server:defaultServer);
        if (!req.query.test) {
            res.json(errMsg);
        } else {
            let testId = req.query.test;
            wptutils.getStatus(testId,server).then((response)=>{
                res.json(response);
            })
        }
    })
    app.get('/result', (req,res) => {
        console.log(req.query);
        if (!req.query.test) {
            res.json(errMsg);
        } else {
            wptutils.getResultSummary(req.query.test).then((result) => {
                res.json(result)
            })
        }
    })
    app.post('/submit', (req, res) => {
        console.log(req.body);
        if (!(req.body.url && req.body.server && req.body.location && req.body.server)) {
            res.json(errMsg);
        } else {
            let url = req.body.url;
            let server = req.body.host;
            let location = req.body.server+":"+req.body.location;
            //res.json({url:url,server:server,location:location});
            wptutils.submitTest(url,server,location).then((response)=>{
                res.json(response);
            })
        }
	});
})