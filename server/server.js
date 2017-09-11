/**
 * Created by noamc on 8/31/14.
 */
var binaryServer = require('binaryjs').BinaryServer,
  https = require('https'),
  wav = require('wav'),
  opener = require('opener'),
  fs = require('fs'),
  connect = require('connect'),
  serveStatic = require('serve-static'),
  UAParser = require('./ua-parser'),
  CONFIG = require("../config.json"),
  lame = require('lame');
Speech = require('@google-cloud/speech');
path = require('path');
var async = require('async');
var lame = require('lame');
var fs = require('fs');
var Speaker = require('speaker');
var volume = require("pcm-volume");
let Stream = require('stream');
const httpReq = require("request");
var strStream = require('string-to-stream')



var uaParser = new UAParser();

if (!fs.existsSync("recordings"))
  fs.mkdirSync("recordings");

var options = {
  key: fs.readFileSync('ssl/server.key'),
  cert: fs.readFileSync('ssl/server.crt'),
};

var app = connect();

app.use(serveStatic('public'));

var server = https.createServer(options, app);
server.listen(9191);
console.log("Server running on 9191");


var server = binaryServer({
  server: server
});

var audioOptions = {
  channels: 2,
  bitDepth: 16,
  sampleRate: 44100,
  mode: lame.STEREO
};


server.on('connection', function(client) {
  console.log("new connection...");
  var fileWriter = null;
  var writeStream = null;
  const speech = Speech();
  var userAgent = client._socket.upgradeReq.headers['user-agent'];
  uaParser.setUA(userAgent);
  var ua = uaParser.getResult();
  let recognizeStream = null;
  client.on('stream', function(stream, meta) {
    console.log("Received audio stream from the client");
    const request = {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: meta.sampleRate,
        languageCode: 'en-US'
      },
      interimResults: false // If you want interim results, set this to true
    };
    // Stream the audio to the Google Cloud Speech API
    recognizeStream = speech.streamingRecognize(request)
      .on('error', console.error)
      .on('data', (data) => {
        if (data.results && data.results.length) {
          recognizeStream.end();
          console.log(`Transcription: ${data.results[0].alternatives[0].transcript}`);
          let userInput = data.results[0].alternatives[0].transcript;
          client.send(strStream("user~"+userInput));
          const options = {
            method: "POST",
            uri: "http://localhost:3000/api/v1/messages",
            json: true,
            headers: {
              "Content-Type": "application/json; charset=utf-8"
            },
            body: {
              message: userInput,
              sid: "12345678",
              hubToken: "agdhasg_ansdasjhdj_asjdasjhd"
            }
          };
          httpReq(options,function(err,body,bbaResp) {
            let answer = bbaResp.messages.length ? bbaResp.messages[0].answer : "Sorry I did not understand that";
            console.log("Answer from BBA : ",answer);
            client.send(strStream("server~"+answer));
            // Create the Speaker instance
            const Player = new Speaker({
              channels: 1,
              bitDepth: 16,
              sampleRate: 16000
            });
            textToSpeech(answer, function(err, audioOutput) {
              let audioStream = new Stream.PassThrough();
              audioStream.end(audioOutput);
              console.log("Streaming the audio to the Player");
              audioStream.pipe(Player);
            });
          });
        }
      });
    stream.pipe(recognizeStream);
  });
  client.on('close', function() {
    console.log("Connection Closed");
    if (recognizeStream != null) {
      recognizeStream.end();
    }
  });
});

function textToSpeech(text, callback) {
  const AWS = require('aws-sdk')
  const Fs = require('fs')
  // Create an Polly client
  const Polly = new AWS.Polly({
    signatureVersion: 'v4',
    region: 'us-east-1'
  });

  let params = {
    'Text': text,
    'OutputFormat': 'pcm',
    'VoiceId': 'Joanna',
    'SampleRate': '16000'
  }
  Polly.synthesizeSpeech(params, (err, data) => {
    if (err) {
      console.log(err.code)
      callback(err, null);
    } else if (data) {
      if (data.AudioStream instanceof Buffer) {
        callback(null, data.AudioStream);
      }
    }
  });

}
