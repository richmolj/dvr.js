DVR
====

Record your javascript application's HTTP interactions and replay them during future test runs for fast, deterministic, accurate tests. Inspired by [VCR](https://github.com/vcr/vcr).

### Usage

```ts
new DVR({
  recordingsFile: 'recordings.json'
})

dvr.broadcastRecording = function(recording) {
  // if needed, custom code to emit can go here
  dvr.saveRecording("series title", recording)
}
```

The `series` acts as a namespace to avoid conflicts between separate tests.

Pass `LIVE=true` to make live calls and record the responses. Otherwise, DVR will play back previous recordings, throwing an error if a given recording is not found.

To make this easier, DVR comes with helpers to facilitating integration with [Nightmare](https://github.com/segmentio/nightmare), a browser automation library.

### Nightmare Integration

To start, we'll need a custom [preload script](https://github.com/segmentio/nightmare#custom-preload-script) to register DVR before we navigate to a page. Then, we'll register DVR with the nightmare instance so we can save recordings:

```ts
import {
  writePreloadFile,
  registerRecordingHandler
} from 'dvr/lib/nightmare-integration'

// Write a custom preload file
let preloadPath = 'tmp/custom-preload.js'
writePreloadFile(require, preloadPath)

// Instantiate nightmare with the custom preload file
let nightmare = new Nightmare({
  webPreferences: {
    preload: path.resolve(preloadPath)
  }
})

// Register DVR with the nightmare instance
registerDVR(dvr, nightmare)
```

Finally, we need to set the current test title on the nightmare instance. This allows to run all recordings in a given "series" - so separate tests can make the same request and not run into conflicts.

Example of setting the current test title in [mocha](https://mochajs.org/):

```
beforeEach(function() {
  nightmare.currentTestTitle = this.currentTest.fullTitle()
})

afterEach(function() {
  delete nightmare.currentTestTitle
})
```

Optionally, you may want to use the `resetDVR` helper. This resets the number of "original requests" (requests made by loading the page). Useful if if you have any logic around counting requests (such as, "wait until the next request finishes"). To use this, call the helper after `goto`:

```ts
nightmare
  .goto('http://example.com')
  .use(resetDVR())
```

DVR is now integrated with nightmare - we can record and playback HTTP interations. Run with `LIVE=true` to make live calls.

### Full Example

Everything you need to run with Nightmare and Mocha:

```ts
import {
  writePreloadFile,
  registerRecordingHandler,
  resetDVR
} from 'dvr/lib/nightmare-integration'

let dvr = new DVR({ recordingsFile: 'recordings.json' })

const buildNightmare = function() {
  let preloadPath = 'tmp/custom-preload.js'
  writePreloadFile(require, preloadPath)

  return new Nightmare({
    webPreferences: {
      preload: path.resolve(preloadPath)
    }
  })
}

let nightmare = buildNightmare()
registerDVR(dvr, nightmare)

describe('some test', function() {
  beforeEach(function() {
    nightmare.currentTestTitle = this.currentTest.fullTitle()
  })

  afterEach(function() {
    delete nightmare.currentTestTitle
  })

  it('works', function() {
    nightmare
      .goto('http://localhost:8080/things')
      .use(resetDVR())
      // now test as normal
  })
})
```