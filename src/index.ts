import * as fs from 'fs'

export interface RecordingAttributes {
  series: string | undefined
  input: RequestInfo
  requestCount: number
  init: RequestInit | undefined
  responseInit?: ResponseInit | undefined
}

export class Recording {
  series: string | undefined
  input: RequestInfo
  json: JSON
  requestCount: number
  init: RequestInit
  responseInit: ResponseInit | undefined

  constructor(attributes: RecordingAttributes) {
    this.series = attributes.series
    this.input = attributes.input
    this.requestCount = attributes.requestCount
    this.init = attributes.init || {}
    this.responseInit = attributes.responseInit
  }
}

type fetchSig = typeof fetch
type mySig = (first : string, second : number) => string

export class DVR {
  requestCount: number = 0
  completedRequests: number = 0
  series: string | undefined
  broadcastRecording: Function
  recordingsFile: string

  constructor(initOptions: { series?: string, recordingsFile: string, broadcastRecording?: Function }) {
    this.series = initOptions.series
    this.recordingsFile = initOptions.recordingsFile
    this.broadcastRecording = initOptions.broadcastRecording || (() => {})
    this.patchWindow()
  }

  patchWindow() {
    if (typeof window === 'undefined') return

    (<any>window)['_originalFetch'] = window.fetch;
    (<any>window)['__dvr__'] = this;
    (<any>window).fetch = (input: RequestInfo, init: RequestInit) => {
      return this.fetch(input, init)
    }
  }

  get recordings() {
    return JSON.parse(fs.readFileSync(this.recordingsFile, 'utf8'));
  }

  set recordings(val: Array<Recording>) {
    fs.writeFileSync(this.recordingsFile, JSON.stringify(val), 'utf8')
  }

  findRecording(input: RequestInfo, init: RequestInit) {
    return this.recordings.filter((r: Recording) => {
      let recordingHeaders = JSON.stringify(r.init['headers'])
      let requestHeaders = JSON.stringify(init['headers'])

      return r.input === input &&
        recordingHeaders === requestHeaders &&
        r.init['method'] == init['method'] &&
        r.series === this.series &&
        r.requestCount === this.requestCount
    })[0]
  }

  playBack(recording: Recording) : Promise<Response> {
    return new Promise((resolve: Function, reject: Function) => {
      let body = JSON.stringify(recording.json)
      console.log('DVR response: ', body)
      let responseInit = recording.responseInit
      let response = new Response(body, responseInit)
      this.completedRequests++
      resolve(response)
    })
  }

  beginRecording(input: RequestInfo, init: RequestInit | undefined) : Promise<Response> {
    let recording = new Recording({
      series: this.series,
      requestCount: this.requestCount,
      input,
      init
    })

    let promise = (<any>window)._originalFetch(input, init)
    promise.then((response: Response) => {
      this.completedRequests++
      response.clone().json().then((json) => {
        recording.responseInit = {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText
        }
        recording.json = json;
        this.broadcastRecording(recording)
      })
    })
    return promise
  }

  saveRecording(recording: Recording) {
    let recordings = this.recordings
    let existing = this.findRecording(recording.input, recording.init)
    if (existing) {
      let index = recordings.indexOf(existing)
      recordings[index] = recording
    } else {
      recordings.push(recording)
    }
    this.recordings = recordings
  }

  fetch(input: RequestInfo, init?: RequestInit | undefined) : Promise<Response> {
    this.requestCount++
    if (!init) init = {}

    let recording = this.findRecording(input, init)

    if (process.env.LIVE === 'true') {
      return this.beginRecording(input, init)
    } else if (recording) {
      return this.playBack(recording)
    } else {
      console.error('Recording not found for', {
        series: this.series,
        requestCount: this.requestCount,
        input,
        init
      })
      throw('Recording not found!')
    }
  }
}