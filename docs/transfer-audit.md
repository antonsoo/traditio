# A source is slow. Is it broken?

This audit began by operating the existing edition, rather than accepting its
previous successful local runs. It found three failures that a fast connection
concealed. The retained before/after observations are in
[`craft-review/transfer-before-after.json`](craft-review/transfer-before-after.json).

| Trigger                                                                             | Observed failure                                                                    | Implemented behavior                                                                                                        |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| The 1,475,726-byte Digest p. 645 arrives continuously at 65,536 bytes/s             | Both browsers discarded it after about 20 seconds, before completion                | Actual byte progress renews a 15-second inactivity clock; a separate 180-second file deadline remains fixed                 |
| A displayed source and two rooms repair the same damaged file                       | Three simultaneous network bodies compete for bandwidth                             | The controlling worker shares one verified transfer among concurrent readers                                                |
| A cold 13 MB edition shares a 128,000-byte/s connection with the open source reader | Firefox makes the installing worker redundant around its one-minute lifecycle limit | Install only the small application shell; the open page retains the large collection through separate bounded file requests |

The revised behavior is exercised by `npm run test:transfer` in Chromium and
Firefox with real streamed HTTP bodies, not browser clock acceleration. The
fixture implements one global bandwidth budget across concurrent responses.
It also stalls actual bodies and stops and restarts the server on the same port.
The current receipt is [`craft-review/transfer.json`](craft-review/transfer.json).

## Transfer and integrity are different checks

A growing body is not yet a trusted source image. The same bounded streaming
reader is used by foreground reads and embedded in the generated worker. It
rejects excess bytes immediately, rejects a short body, checks declared decoded
length where applicable, and stops downloading on rejection or cancellation.
Only the expected SHA-256 permits display, export or cache retention. HTTP status
200 alone is insufficient. User explanations survive failures and retries.

The worker verifies a missing file before it returns a response. During that
interval, the foreground cannot observe response-body chunks directly. Scoped
progress notices therefore identify the controller, edition, exact path, total
size and strictly increasing byte count. They renew the foreground inactivity
clock, never its total deadline. Unrelated workers and messages cannot keep a
source request alive. Superseded requests cannot replace the selected page.

HTTP compression is handled as transport, not retained content. Fetch has already
decoded the body. Reconstructed cache responses remove `Content-Encoding`,
`Content-Length` and `Content-Range` so an offline reader does not decode those
bytes again or mistake the wire length for the source length. The browser audit
serves one source with gzip and verifies its decoded hash after a real outage.

## Installing the shell is not offline readiness

Mozilla's [worker-lifetime report](https://bugzilla.mozilla.org/show_bug.cgi?id=2086212)
documents the install-event limitation encountered in this audit. Increasing an
application timer cannot extend a browser's event lifetime. The source collection
therefore does not belong in one long install event.

The shell installs with its own verified files. The active worker reports a
manifest; the page accepts only same-origin paths in this application scope,
unique identities, bounded sizes and SHA-256 hashes. The page checks retained
files and fetches missing ones through the worker. Each network file has the
inactivity and total bounds above, and the page's saving job has a five-minute
ceiling. Failed bulk retention preserves verified files but says the edition is
incomplete; a reload or reconnection resumes the missing work. A failed shell
installation deletes its partial shell instead. Neither path claims readiness.

After retention, the worker independently checks the complete inventory again.
Only a matching controlling worker and a fully verified inventory permit the
footer to say that every source is available offline. A subsequent observed
failure withdraws that claim across open tabs. Saving the native notebook remains
available throughout. Updates still wait for older readers to leave; no forced
reload or automatic loss of their explanations is introduced.

These are measured browser behaviors under the recorded conditions, not a
promise that browsers keep background pages or workers alive indefinitely.
Files still have a total deadline, browser storage may be evicted, and a closed
page cannot continue the window-driven saving job. Explicit JSON and standalone
HTML downloads are separate retained copies.

## Finishing a save must not cancel its returning file

A public Firefox phone run exposed one further race. The worker cached the last
file and announced restored inventory before returning its verified Response.
The page immediately inspected again and canceled its still-returning saving
request. Chromium reported `ERR_ABORTED` for `work-NOTICE.txt`; Firefox sometimes
also emitted the unexpected-worker console error. The footer could still be
correct because the bytes were saved, but the canceled read was unnecessary.

```text
Worker                         Page
cache final verified file ---> receives restored notice
                               cancels returning read (earlier behavior)
return Response -------------> canceled request

cache final verified file ---> defers the notice during its saving job
return Response -------------> completes that job
                               checks full inventory -> ready
```

The page now defers a restored notice for its current saving job until that job
settles. An invalidation still acts immediately. If a restored notice arrived
before a failed job settled, the page checks the actual inventory rather than
asserting incompleteness from that canceled or failed read alone.

The [before/after receipt](craft-review/retention-finish.json) records three fresh
profiles per browser. Before the fix, Chromium canceled the last read in all
three and Firefox reproduced both the cancellation and console error once.
After the fix, all six completed without that canceled read or console error.
The slow-transfer browser driver additionally requires that the final retained
file is not canceled during a cold throttled installation. This fixes the
reproduced race; it does not suppress or whitelist browser console errors.
