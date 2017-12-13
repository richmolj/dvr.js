import * as fs from 'fs'

// resolver is the calling context's require
export function writePreloadFile(resolver: any, path: string) {
  let preloadCode = fs.readFileSync(resolver.resolve("nightmare/lib/preload.js"), 'utf8')
  let dvrPreloadCode = fs.readFileSync(resolver.resolve("dvr/lib/nightmare-preload.js"), 'utf8')
  let customCode = `${preloadCode}\n\n${dvrPreloadCode}`
  fs.writeFileSync(path, customCode)
}

export function registerDVR(dvr: any, nightmare: any) {
  nightmare.on('page', function(type: string, recording: any) {
    if (type === 'saveRecording') {
      dvr.saveRecording(recording)
    }
  })
}

// we've loaded the page and fired requests for initial data
// so record that new baseline
export function resetDVR() {
  return function(nm: any) {
    nm.evaluate(function() {
      (<any>window)['__dvr__'].originalRequests = (<any>window)['__dvr__'].completedRequests;
    })
  }
}

export function setTest(title: string) {
  return function(nm: any) {
    fs.writeFileSync('.dvr.series', title)
  }
}

export function unsetTest() {
  return function(nm: any) {
    fs.unlinkSync('.dvr.series')
  }
}