const heatmap = require('./heatmap');
const wptutils = require('./wpt-utils');
const express = require('express');
const path = require('path');

const bodyParser = require('body-parser');
const compression = require('compression');
const url = require('url');

const {NODE_ENV} = process.env;
if (NODE_ENV == "development") {
    require('dotenv').config();
}

const defaultServer = process.env.WPT_SERVER;

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(compression())

app.use(express.static('public'))

let port = process.env.PORT;

const errMsg = {"statusCode":400,"statusText":"Generic ERROR"};

app.listen(port, () => {
    app.get('/locations', (req,res) => {
        let server = (req.query.server?req.query.server:defaultServer);
        wptutils.getLocations(server).then((locations) => {
            res.json(locations);
        })
    })
    app.get('/status', (req, res) => {
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
        if (!req.query.test) {
            res.json(errMsg);
        } else {
            wptutils.getResultSummary(req.query.test).then((result) => {
                res.json(result)
            })
        }
    })
    app.post('/submit', (req, res) => {
        if (!(req.body.url && req.body.server && req.body.location && req.body.server)) {
            res.json(errMsg);
        } else {
            let url = req.body.url;
            let server = req.body.host;
            let location = req.body.server+":"+req.body.location;
            wptutils.submitTest(url,server,location).then((response)=>{
                res.json(response);
            })
        }
    });
    app.get('/heatmap', (req,res) => {
        if (!req.query.test) {
            res.json({"statusCode":400,"statusText":"Test ID not supplied"});
        }
        server = (req.query.server?req.query.server:defaultServer);
        wptutils.createHeatmap(req.query.test,path.join('public','tests')).then(()=>{
            res.json({"statusCode":200,"statusText":`Heatmap for ${req.query.test} generated`});
        })
    })
})