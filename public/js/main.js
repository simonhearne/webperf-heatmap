function getLocations() {
    server = document.getElementById("wpt-host").value;
    let url = `/locations?server=${server}`;
    fetch(url)
        .then((res) => {
            if (!res.ok) {
                throw Error(res.statusText);
            }
            return res.json()})
        .then((data) => {
            parseLocations(data,'wpt-location')
            })
        .catch((error)=>{
            statusUpdate({"status":"error","message":`Failed to get locations from <em>${server}</em><br/>${error}`});
        });
}

function statusUpdate(opts) {
    let elem = document.getElementById("status");
    let stat = "info";
    if ("status" in opts) stat = opts.status;
    let message = ""
    if ("message" in opts) message = opts.message;
    elem.className = stat;
    elem.innerHTML = message;
}

function parseLocations(locationData,selectElem) {
    let locations = locationData.response.data.location;
    groups = {};
    locations.forEach((location)=>{
        let group = location.group;
        if (group !== undefined) {
            if (!(group in groups)) {
                groups[group] = {"name":group,"locations":[]};
            }
            groups[group].locations.push(location);
        }
    });
    window.wpt.locations = locations;
    window.wpt.groups = groups;
    let select = document.getElementById(selectElem);
    for (group in groups) {
        let optgroup = document.createElement('optgroup');
        optgroup.label = group;
        for (var i in groups[group].locations) {
            let location = groups[group].locations[i];
            if (location.status == "OK") {
                let opt = document.createElement('option');
                opt.id = location.id;
                opt.text = location.Label;
                let pendTests = location.PendingTests.Total;
                if (pendTests > 5) {
                    opt.text += ` - ${pendTests} queued tests`;
                }
                optgroup.appendChild(opt);
            }
        }
        select.add(optgroup);
    }
    updateBrowsers();
}

function updateBrowsers() {
    let elem = document.getElementById("wpt-location");
    let targetElem = document.getElementById("wpt-browser");
    let selection = elem.options[elem.options.selectedIndex];
    let server = selection.id;
    let browsers = window.wpt.locations.filter((obj)=>{return obj.id==server})[0].Browsers.split(",");
    clearOptions(targetElem);
    for (var i in browsers) {
        let opt = document.createElement('option');
        opt.id = browsers[i]
        opt.text = browsers[i];
        targetElem.add(opt);
    }
}

function clearOptions(elem) {
    if (typeof(elem)=="string") {
        elem = document.getElementById(elem);
    }
    for ( var i = elem.options.length - 1 ; i >= 0 ; i--)
    {
        elem.remove(i);
    }

}

function checkStatus(testId) {
    server = document.getElementById("wpt-host").value;
    let url = `/status?server=${server}&test=${testId}`;
    fetch(url)
    .then((res) => {
        if (!res.ok) {
            throw Error(res.statusText);
        }
        return res.json()})
    .then((data) => {
        parseStatus(data,testId)
    })
    .catch((error)=>{
        statusUpdate({"status":"error","message":`Failed to get test status for <em>${testId}</em> from <em>${server}</em><br/>${error}`});
    });

}

function generateHeatmap(testId) {
    let url = `/heatmap?test=${testId}`;
    fetch(url)
    .then((res) => {
        if (!res.ok) {
            throw Error(res.statusText);
        }
        return res.json()})
    .then((data) => {
        statusUpdate({"status":"success","message":`Heatmap generated. Redirecting to /render/?test=${testId}`});
        window.location=`/render/?test=${testId}`;
    })
    .catch((error)=>{
        statusUpdate({"status":"error","message":`Failed to generate heatmap for <em>${testId}</em><br/>${error}`});
    });
}

function parseStatus(data,testId) {
    console.log(data);
    if (data.statusCode == 100 || data.statusCode == 101) {
        /* test is queued / testing */
        statusUpdate({"status":"info","message":data.statusText+"<br/>Test ID: <em>"+testId+"</em>"});
        window.setTimeout(()=>{checkStatus(testId)},2500);
    } else if (data.statusCode == 200) {
        statusUpdate({"status":"success","message":"Test Complete. Generating heatmap..."});
        generateHeatmap(testId);
        /* test is complete */
    } else {
        /* error? */
        statusUpdate({"status":"error","message":`Test Failed (${data.statusCode}).<br/>${data.statusText}`});
    }
}

function useExistingTest() {
    let testId = document.getElementById('wpt-test-id').value;
    checkStatus(testId);
}

function submitTest() {
    let url = document.getElementById("url").value;
    let host = document.getElementById("wpt-host").value;
    let location = document.getElementById("wpt-location");
    let server = location.options[location.options.selectedIndex].id;;
    let browser = document.getElementById("wpt-browser").value;
    if (url.length>5 && host && server && browser) {
        let path = "/submit";
        let payload = {
            host: host,
            url: url,
            server: server,
            location: browser
        }
        return fetch(path, {
            body: JSON.stringify(payload),
            cache:'no-cache',
            credentials: 'same-origin',
            headers: {
                "content-type": 'application/json'
            },
            method: 'POST'
        }) 
            .then(response => response.json())
            .then((data) => {
                console.log(data);
                if (data.statusCode !== 200) {
                    statusUpdate({"status":"error","message":`Test has not been submitted, error message: ${data.statusText}`});    
                    return false;
                } else {
                    let testId = data.data.testId;
                    window.wpt.testId=testId;
                    statusUpdate({"status":"success","message":`Test has been submitted<br/>Test ID: <em>${testId}</em>`});
                    setTimeout(()=>{checkStatus(testId)},1000);
                    return true;
                }
            })
        }
    statusUpdate({"status":"error","message":"Please ensure all fields are completed"});
    return false;
}


const getParameterByName = function(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
const loadImages = function () {
    let frameJSONurl = `../tests/${window.heatmap.testId}/frames.json`;
    fetch(frameJSONurl)
        .then((response)=>{return response.json()})
        .then((data)=>{
            window.heatmap.frames = data;
            renderFrames();
            updateOpacity();
            updateGrayscale();
            updateBudget();
    })
}
const renderFrames = function() {
    var finalimg = document.createElement("img");
    finalimg.className="img-heatmap";
    finalimg.id = "img-heatmap-final-frame";
    finalimg.src = `../tests/${window.heatmap.testId}/final.jpg`;
    document.getElementById("heatmap-container").appendChild(finalimg);
    
    var heatmapOverlayContainer = document.createElement('div');
    heatmapOverlayContainer.id="heatmap-overlay-container";
    for (var i=window.heatmap.frames.length-1;i>=0;i--) {
        var img = document.createElement("img");
        img.className="img-heatmap img-heatmap-overlay";
        img.id = `img-heatmap-overlay-${window.heatmap.frames[i].time}`
        img.src = window.heatmap.frames[i].frame;
        heatmapOverlayContainer.appendChild(img);
    }
    document.getElementById("heatmap-container").appendChild(heatmapOverlayContainer);
    updateColors();
};

const updateOpacity = function() {
    let opacity = document.getElementById('heatmap-control-opacity').value;
    document.getElementById("heatmap-overlay-container").style.opacity = opacity;
    document.getElementById("heatmap-control-opacity-value").innerHTML = `${parseInt(opacity*100)}%`;
};
const updateGrayscale = function() {
    let gray = 100-document.getElementById('heatmap-control-gray').value;
    document.getElementById("img-heatmap-final-frame").style.filter = `grayscale(${gray}%)`;
    document.getElementById("heatmap-control-gray-value").innerHTML = `${100-gray}%`;
};
const updateBudget = function() {
    window.heatmap.budget = parseInt(document.getElementById("heatmap-control-budget").value);
    document.getElementById("heatmap-control-budget-value").innerHTML = `${window.heatmap.budget.toLocaleString()}ms`;
    window.heatmap.maxTime = window.heatmap.budget;
    window.heatmap.minTime = window.heatmap.budget/2;
    updateColors();
}

const updateColors = function() {
    for (var i in window.heatmap.frames) {
        var elem = document.getElementById(`img-heatmap-overlay-${window.heatmap.frames[i].time}`);
        var hue = hueFromBudget(window.heatmap.budget,window.heatmap.frames[i].time);
        elem.style.filter = `hue-rotate(${hue}deg) saturate(1000%)`;
    }
}
const hueFromBudget = function(budget,time) {
    let maxHue = -60;
    let minHue = 60;
    if (time < window.heatmap.minTime) {
        hue = minHue;
    } else if (time >= window.heatmap.maxTime) {
        hue = maxHue;
    } else {
        var f = (time-window.heatmap.minTime)/(window.heatmap.maxTime-window.heatmap.minTime);
        hue = minHue - f * (minHue-maxHue);
    }
    return hue;
}

const getTestInfo = function(test=null) {
    testId = (test==null?window.heatmap.testId:test);
    let url = `/result?test=${testId}`;
    fetch(url)
        .then((res) => {
            if (!res.ok) {
                throw Error(res.statusText);
            }
            return res.json()})
        .then((data) => {
            parseResults(data);
        })
        .catch((error)=>{
            throw Error({"status":"error","message":`Failed to get locations from <em>${server}</em><br/>${error}`});
        });
}

const parseResults = function(data) {
    document.getElementById("test-url").innerHTML = data.data.testUrl;
    document.getElementById("test-from").innerHTML = data.data.from.replace(/<b>/gi,"").replace(/<\/b>/gi,"");
    let d = new Date(data.data.completed * 1000);
    document.getElementById("test-run-at").innerHTML = d.toLocaleString();
    document.getElementById("test-link").innerHTML = `<a href="${data.data.summary}" target="_blank">View on WPT</a>`;
}

const scrollyBudget = function() {
    let current = parseInt(document.getElementById("heatmap-control-budget").value);
    scrollBudget(10000,250)
}
const scrollBudget = function(end,current) {
    console.log(end,current)
    let interval = 100;
    if (current < end) {
        current += interval;
        document.getElementById("heatmap-control-budget").value = current;
        updateBudget();
        setTimeout(()=>{scrollBudget(end,current)},250);
    }
}