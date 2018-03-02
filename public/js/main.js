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
                if (opt.id == "Dulles") {
                    opt.selected = "selected";
                }
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
    let cURL = new URL(url)
    return cURL.searchParams.get(name);
}

const loadImages = function () {
    let frameJSONurl = `../tests/${window.heatmap.testId}/frames.json`;
    fetch(frameJSONurl)
        .then((response)=>{return response.json()})
        .then((data)=>{
            window.heatmap.frames = data;
            getUrl();
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
    finalimg.onload = setRatio;
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
    window.heatmap.opacity = document.getElementById('heatmap-control-opacity').value;
    document.getElementById("heatmap-overlay-container").style.opacity = window.heatmap.opacity;
    document.getElementById("heatmap-control-opacity-value").innerHTML = `${parseInt(window.heatmap.opacity*100)}%`;
    setUrl();
};
const updateGrayscale = function() {
    window.heatmap.gray = 100-document.getElementById('heatmap-control-gray').value;
    document.getElementById("img-heatmap-final-frame").style.filter = `grayscale(${window.heatmap.gray}%)`;
    document.getElementById("heatmap-control-gray-value").innerHTML = `${100-window.heatmap.gray}%`;
    setUrl();
};
const updateBudget = function() {
    window.heatmap.budget = parseInt(document.getElementById("heatmap-control-budget").value);
    if (window.heatmap.budget < window.heatmap.minimum) {
        window.heatmap.minimum = window.heatmap.budget;
    }
    document.getElementById("heatmap-control-budget-value").innerHTML = `${window.heatmap.budget.toLocaleString()}ms`;
    
    let visuallyComplete = 0;
    for (var i in window.heatmap.frames) {
        visuallyComplete = window.heatmap.frames[i].visuallyComplete;
        if (window.heatmap.frames[i].time > window.heatmap.budget) {
            break;
        }
    }
    document.getElementById("heatmap-visuallycomplete").innerHTML = parseInt(visuallyComplete);
    updateColors();
    setUrl();
}

const updateColors = function() {
    for (var i in window.heatmap.frames) {
        var elem = document.getElementById(`img-heatmap-overlay-${window.heatmap.frames[i].time}`);
        var hue = hueFromBudget(window.heatmap.frames[i].time);
        elem.style.filter = `hue-rotate(${hue}deg) saturate(1000%)`;
    }
}
const hueFromBudget = function(time) {
    let maxHue = -60;
    let minHue = 60;
    var f = (time-window.heatmap.minimum)/(window.heatmap.budget-window.heatmap.minimum);
    hue = minHue - f * (minHue-maxHue);
    if (hue > minHue) hue = minHue;
    if (hue < maxHue) hue = maxHue;
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
    let speedindex = parseInt(data.data.median.firstView.SpeedIndex);
    document.getElementById("test-url").innerHTML = data.data.testUrl;
    document.getElementById("test-from").innerHTML = data.data.from.replace(/<b>/gi,"").replace(/<\/b>/gi,"");
    let d = new Date(data.data.completed * 1000);
    document.getElementById("test-run-at").innerHTML = d.toLocaleString();
    document.getElementById("test-link").innerHTML = `<a href="${data.data.summary}" target="_blank">View on WPT</a>`;
}

const scrollyBudget = function() {
    let playPause = document.getElementById("heatmap-control-play");
    if (window.heatmap.isScrolling) {
        playPause.innerHTML = "►"
        window.heatmap.isScrolling = false;
    } else {
        window.heatmap.isScrolling = true;
        playPause.innerHTML = "◾";
        scrollBudget(10000,250);
    }
}
const scrollBudget = function(end,current) {
    if (!window.heatmap.isScrolling) {
        document.getElementById("heatmap-control-play").innerHTML = "►";
        return;
    }
    let interval = 100;
    if (current <= (end - interval)) {
        current += interval;
        document.getElementById("heatmap-control-budget").value = current;
        updateBudget();
        setTimeout(()=>{scrollBudget(end,current)},150);
    } else {
        document.getElementById("heatmap-control-play").innerHTML = "►";
    }
}

const setRatio = function() {
    let imgEl = document.getElementById("img-heatmap-final-frame");
    let ratio = imgEl.naturalWidth / imgEl.naturalHeight;
    let maxWidth = 800 * (ratio * 0.9);
    document.getElementById("heatmap-container").style.maxWidth = maxWidth;
}

const setUrl = function() {
    let cURL = new URL(window.location.href)
    cURL.searchParams.set('b',window.heatmap.budget);
    cURL.searchParams.set('o',window.heatmap.opacity);
    cURL.searchParams.set('s',window.heatmap.gray);
    cURL.searchParams.set('m',window.heatmap.minimum);
    window.history.replaceState(null,null,cURL.toString());
}

const getUrl = function() {
    let cURL = new URL(window.location.href)
    window.heatmap.budget = (cURL.searchParams.get('b')==null?5000:cURL.searchParams.get('b'));
    window.heatmap.opacity = (cURL.searchParams.get('o')==null?0.95:cURL.searchParams.get('o'));
    window.heatmap.gray = (cURL.searchParams.get('s')==null?50:cURL.searchParams.get('s'));
    window.heatmap.minimum = (cURL.searchParams.get('m')==null?window.heatmap.budget/2:parseInt(cURL.searchParams.get('m')));
    setUrl();
    setSliders();
}

const setSliders = function() {
    document.getElementById("heatmap-control-opacity").value = window.heatmap.opacity;
    document.getElementById('heatmap-control-gray').value = 100 - window.heatmap.gray;
    document.getElementById("heatmap-control-budget").value = window.heatmap.budget;
}