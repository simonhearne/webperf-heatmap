const ndarray = require("ndarray");
const getPixels = require("get-pixels");
const savePixels = require("save-pixels");
const zeros = require("zeros");
const fs = require("fs");

var result;

const createMask = function(image,result) {
    return new Promise((resolve,reject) => {
        getPixels(image,function(err,pixels) {
            if (err) {
                return reject(err);
            } else {
                result = zeros([pixels.shape[0],pixels.shape[1],4]);
                return resolve(result);
            }
        });
    });
}

const compareImages = function(result,image1,image2,color=[255,255,255],threshold=0.1) {
    return new Promise((resolve,reject) => {
        getPixels(image1, function(err, pixels1) {
            getPixels(image2, function(err, pixels2) {
                if (err) {
                    return reject(err);
                } else {
                    result = compareArrays(result,pixels1,pixels2,color,threshold);
                    return resolve(result);
                }
            })
        })
    })
}

const compareArrays = function(result,array1,array2,color,threshold) {
    a = 255;
    for (let x=0; x<array1.shape[0]; x++) {
        for (let y=0; y<array1.shape[1]; y++) {
            diff = false;
            diffcheck: for (let i=0;i<3;i++) {
                if (Math.abs(array1.get(x,y,i)-array2.get(x,y,i)) > array1.get(x,y,i)*threshold) {
                    diff = true;
                    break diffcheck;
                }
            }
            if (diff) {
                result.set(x,y,0,color[0]);
                result.set(x,y,1,color[1]);
                result.set(x,y,2,color[2]);
                result.set(x,y,3,a);
            }
        }
    }
    return result;
}

const msFromFilename = function(filename) {
    // Kinda specific here...
    let start = filename.indexOf("_")+1;
    let end = filename.indexOf(".")
    return parseInt(filename.slice(start,end));
}

const colorFromBudget = function(budget,time) {
    let hue = 0;
    if (time > budget) {
        hue = 0;
    } else if (time == 0) {
        hue = 120;
    } else {
        let offset = time / budget;
        hue = 120-(120*offset);
    }
    return hsl2rgb(hue,0.9,0.4);
}

const hsl2rgb = function(hue, saturation, lightness){
    if( hue == undefined ){
      return [0, 0, 0];
    }
  
    var chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
    var huePrime = Math.floor(hue / 60);
    var secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));
  
    var red;
    var green;
    var blue;
  
    if( huePrime === 0 ){
      red = chroma;
      green = secondComponent;
      blue = 0;
    }else if( huePrime === 1 ){
      red = secondComponent;
      green = chroma;
      blue = 0;
    }else if( huePrime === 2 ){
      red = 0;
      green = chroma;
      blue = secondComponent;
    }else if( huePrime === 3 ){
      red = 0;
      green = secondComponent;
      blue = chroma;
    }else if( huePrime === 4 ){
      red = secondComponent;
      green = 0;
      blue = chroma;
    }else if( huePrime === 5 ){
      red = chroma;
      green = 0;
      blue = secondComponent;
    }
  
    var lightnessAdjustment = lightness - (chroma / 2);
    red += lightnessAdjustment;
    green += lightnessAdjustment;
    blue += lightnessAdjustment;
  
    return [Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255)];
  
  };

const pathJoin = function(path,fn) {
    return path+"/"+fn;
}

const imageSort = function(a,b) {
    if (a==b) {
        return 0;
    } else if (msFromFilename(a)>msFromFilename(b)) {
        return 1;
    } else {
        return -1;
    }
}

const saveArray = function(result,filename) {
    let out = fs.createWriteStream(filename);
    let stream = savePixels(result, "png");
    stream.pipe(out);
    return out;
}

const getImageArrayFromDirectory = function(directory) {
    let frames = fs.readdirSync(directory);

    let imageArray = [];
    for (let i in frames) {
        let dot = frames[i].indexOf(".");
        if (dot > 0) {
            if (['jpg','png'].indexOf(frames[i].substring(dot+1))>-1) {
                imageArray.push(frames[i]);
            }
        }
    }
    imageArray.sort(imageSort);
    return imageArray;
}

module.exports = function generateHeatmapFromFrames(imagePath,budget,outputFilename) {
    return new Promise((resolve,reject)=>{
        outputFilename = (outputFilename == undefined ? `${imagePath}_heatmap.png`: outputFilename);
        let frames = getImageArrayFromDirectory(imagePath);
        let finalFrame = pathJoin(imagePath,frames.pop());

        createMask(finalFrame).then((result)=>{
            let chain = Promise.resolve();
            for (let i in frames) {
                let fn = pathJoin(imagePath,frames[i]);
                let ms = msFromFilename(frames[i]);
                let color = colorFromBudget(budget,ms);
                chain = chain
                    .then((next_result)=>{
                        if (next_result) {
                            return compareImages(next_result,finalFrame,fn,color);
                        } else {
                            return compareImages(result,finalFrame,fn,color);
                        }
                    }
                );
            }
            chain.then((final_result)=>{
                filestream = saveArray(final_result,outputFilename);
            }).then(()=>{
                return resolve({outputFilename:outputFilename,finalFrame:finalFrame});
            })
        })
    })
}