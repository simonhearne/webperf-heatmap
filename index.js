const heatmap = require('./heatmap');
const wptutils = require('./wpt-utils');

let testIds = [
    "180219_13_4263ea10ce6841c6e417ace70136c98b", // britishairways
    "180220_K7_33c53d404a902d19c13eb67b9fae355c", // dailymail
    "180220_R9_9f8c3a8e7cb713dc79141645f3e1e313" // ferrari
];
for (var i in testIds) {
    console.log("Submitting",testIds[i]);
    wptutils(testIds[i]).then(()=>{
        console.log("Complete",testIds[i]);
    });
}