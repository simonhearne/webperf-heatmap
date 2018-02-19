const path = require('path');
const fs = require('fs-extra');
const webpagetest = require('webpagetest');
const heatmap = require('./heatmap');
const admzip = require('adm-zip');

module.exports = function wptUtils(testId) {
    const testsDir = 'tests';
    const wpt = new webpagetest();
    
    wpt.getTestStatus(testId, {request: 12345}, (err,data) => {
        if (err) throw new Error(err);
        else if (data.statusCode == 200) {
            createDir(testId);
        }
        else {
            return data.statusCode;
        }
    });
    

    const createDir = function() {
        let dir = path.join(testsDir,testId);
        let tmpdir = path.join(dir,'tmp');
        
        if (fs.existsSync(dir)){
            fs.removeSync(dir)
        }
        fs.mkdirSync(dir);
        fs.mkdirSync(tmpdir);
        
        /* first get filmstrip images somewhere */
        wpt.getFilmstrip(testId,{},(err,data)=>{
            if (err) throw new Error(err);
            let zip = new admzip(data);
            zip.extractAllTo(tmpdir,true);
            generateHeatmap(dir,tmpdir);
        });
    }

    const generateHeatmap = function(dir,tmpdir) {
        heatmap(tmpdir,10000,path.join(dir,'heatmap.png')).then((filenames)=>{
            fs.createReadStream(filenames.finalFrame).pipe(fs.createWriteStream(path.join(dir,'final.jpg')));
            fs.removeSync(tmpdir);
            return dir;
        })
    }

}