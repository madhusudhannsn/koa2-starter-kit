/**
 * Created by noamc on 8/31/14.
 */

$(function() {
  var client,
    recorder,
    context,
    bStream,
    contextSampleRate = (new AudioContext()).sampleRate;
  resampleRate = contextSampleRate,
    worker = new Worker('js/worker/resampler-worker.js');

  worker.postMessage({
    cmd: "init",
    from: contextSampleRate,
    to: resampleRate
  });

  worker.addEventListener('message', function(e) {
    if (bStream && bStream.writable)
      bStream.write(convertFloat32ToInt16(e.data.buffer));
  }, false);

  function arrayBufferToString(buffer) {
    var arr = new Uint8Array(buffer);
    var str = String.fromCharCode.apply(String, arr);
    if (/[\u0080-\uffff]/.test(str)) {
      throw new Error("this string seems to contain (still encoded) multibytes");
    }
    return str;
  }
  $(".speaker-mic").click(function() {
    close();
    $(".listen-text").show();
    client = new BinaryClient('wss://' + location.host);
    console.log("Client : ", client);
    console.log("Context : ", context);
    client.on('open', function() {
      bStream = client.createStream({
        sampleRate: resampleRate
      });
    });

    client.on('stream', function(stream) {
      stream.on('data', function(chunk) {
        $(".listen-text").hide();
        let text = arrayBufferToString(chunk);
        console.log(text);
        if(text) {
          let textArr = text.split("~");
          if(textArr[0] == "user") {
            console.log("User Input", textArr[1]);
            $(".conversation-exchange").append(`<div><p class = "userInput">${textArr[1]}</p></div>`);
          }
          else {
            console.log("Server Output", textArr[1]);
            $(".conversation-exchange").append(`<div><p class = "sereverOutput">${textArr[1]}</p></div>`);
          }
        }

      });
      stream.on('end', function(chunk) {
        console.log("End of the stream");
      });
    });

    if (context) {
      recorder.connect(context.destination);
      return;
    }

    var session = {
      audio: true,
      video: false
    };


    navigator.getUserMedia(session, function(stream) {
      context = new AudioContext();
      var audioInput = context.createMediaStreamSource(stream);
      var bufferSize = 0; // let implementation decide

      recorder = context.createScriptProcessor(bufferSize, 1, 1);

      recorder.onaudioprocess = onAudio;

      audioInput.connect(recorder);

      recorder.connect(context.destination);

    }, function(e) {

    });
  });

  function onAudio(e) {
    var left = e.inputBuffer.getChannelData(0);

    worker.postMessage({
      cmd: "resample",
      buffer: left
    });

  }

  function convertFloat32ToInt16(buffer) {
    var l = buffer.length;
    var buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
    }
    return buf.buffer;
  }

  $("#stop-rec-btn").click(function() {
    close();
  });

  function close() {
    console.log('close');
    if (recorder)
      recorder.disconnect();
    if (client)
      client.close();
  }
});

navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia;
