let { DVR } = require('dvr-js')
let fs = require('fs')

const dvrConfig = require('../package.json').dvrConfig
dvrConfig.series = fs.readFileSync('.dvr.series', 'utf8')

dvrConfig.broadcastRecording = function(recording) {
  __nightmare.ipc.send('page', 'saveRecording', recording)
}

let dvr = new DVR(dvrConfig)