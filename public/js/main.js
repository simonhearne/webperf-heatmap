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
            let opt = document.createElement('option');
            opt.id = location.id;
            opt.text = location.Label;
            optgroup.appendChild(opt);
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
                    statusUpdate({"status":"success","message":`Test has been submitted, id=${testId}`});
                    return true;
                }
            })
        }
    statusUpdate({"status":"error","message":"Please ensure all fields are completed"});
    return false;
}