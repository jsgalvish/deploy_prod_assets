'use strict';

const AWS = require('aws-sdk');
const request = require('request');
const sharp = require('sharp');

const BUCKET_NAME = process.env.BUCKET_ASSETS;
const REGION = process.env.BUCKET_REGION;
const s3 = new AWS.S3();

module.exports.submit = (event, context, callback) => {

  const requestBody = JSON.parse(event.body);
  let { clientId, fileB64, urlFile } = requestBody;
  let typeProcess = undefined;

  if(typeof urlFile == "string") {
    typeProcess = 0;
  }
  if(typeof fileB64 == "string") {
    typeProcess = 1;
  }

  if (typeof clientId !== 'string' && (typeof urlFile !== 'string' || typeof fileB64 !== 'string')) {
    fileNoPermitted('Validation Errors', callback);
    return;
  }

  switch (typeProcess) {
    case 0:
      //let extn = /(jpg|jpeg|png|gif)/.exec(urlFile);
      //console.log(urlFile);
      //if(extn == null) fileNoPermitted('extension Errors', callback);
      //let urlNameFile = 'file' + new Date().getTime() +"."+ extn[0];
      save_from_url(urlFile, callback);
      break;

    case 1:
      let mime2 = fileB64.substring(fileB64.indexOf("/") + 1, fileB64.indexOf(";"));
      console.log(mime2);
      normalizeBase64(fileB64, callback);
        break;
    default:
      fileNoPermitted('Default Errors', callback);
      break;
  }
};

function save_from_url(url, callback) {
  request({
    url: url,
    encoding: null
  }, function(err, res, body) {
    if (err) {
      fileNoPermitted('Save URL Errors', callback);
    } else {
      //upload_to_s3(key, body, callback);
      normalizeBuffer(body, callback);
    }
  })
}

function upload_to_s3(key, body, callback) {
  console.log("UPLOAD TO S3", 'image/ =>>> ',  key);
  console.log("UPLOAD TO S3", 'image/'+key.split(".")[1]);
  s3.putObject({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body, // buffer,
    ContentType: 'image/'+key.split(".")[1]// r
  }, function(error, data) {
      if(error) fileNoPermitted('Upload Errors', callback);
      console.log("Key successfully", key);
      callback(null, {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({"Location": `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`})
      });
  });
}

function fileNoPermitted(message, callback) {
  callback(null, {
    statusCode: 500,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      message: message
    })
  });
}

function normalizeBase64 (base64_string, callback){
  const base64Data = base64_string.split(';base64,').pop();
  let imgBuffer =  Buffer.from(base64Data, 'base64');
  normalizeBuffer(imgBuffer, callback);
}

function normalizeBuffer (imgBuffer, callback){

  sharp(imgBuffer)
    .toFormat('jpeg')
    .jpeg({
      force: true,
    })
    .toBuffer()
    .then(data_img => {
      let buffer64 = "data:image/jpeg;base64," + data_img.toString('base64');
      let bodyFile = buffer64;
      let extn = /(jpg|jpeg|png|gif)/.exec(buffer64);
      if(extn == null) fileNoPermitted('Base64 Errors', callback);
      let nameFile = 'file' + new Date().getTime() +'.'+ extn[0];
      upload_to_s3(nameFile, data_img, callback);
    })
    .catch(err => { console.error(err)});
}
