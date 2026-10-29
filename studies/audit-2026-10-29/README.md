# Audit of the initial Traditio edition

Reproductions started at commit `85453db`. The fixes and new counterexample
workflow are in `e016ae3`. The receipts record observed behavior, not inferred
success from a command's exit status.

| Reproduction                                                                      | Before                                                                                                   | Result after the change                                                                                                      |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Install preview, replace it with development on the same origin, reload           | The old worker served the built application, hiding source edits                                         | Separate documented ports; development module and live controls verified in the same browser context as a controlled preview |
| Hold a source request during casebook export                                      | Save stayed disabled with no cancel action or useful initial progress                                    | Visible progress, cancellation with focus recovery, 20-second deadline, no false download, successful retry                  |
| Open a two-case standalone HTML document                                          | Both SVGs reused the same accessible-description IDs; the pinned figure resolved the current case's text | Each figure's title and description resolve to its own unique nodes; the argument's third figure is separate too             |
| Corrupt a source during first worker installation and wait for the worker to fail | The footer kept saying it was preparing an offline edition                                               | Failed installation is reported; reload after restoring the source installs successfully                                     |
| Damage the cached source and also serve incorrect replacement bytes               | Strengthened behavior audited after the fix                                                              | The worker refuses both; restoring the exact source repairs the cache                                                        |
| Make a second valid edition available while the first reader is open              | Edition transition audited after the fix                                                                 | The reader retains its edition; the new worker takes over after the old reader closes                                        |

The `before-*.json` files are the original observations. `after-browser-audit.json`
comes from `npm run test:audit`, using real Chromium and Firefox. Fault requests
are held or corrupted by the review harness, never represented as real outages
on the public site. The timeout check advances the page clock by 20.1 seconds.

Additional reproductions, from the repository root after a build:

```sh
node studies/audit-2026-10-29/development.mjs
node --import tsx studies/audit-2026-10-29/diagrams.mjs
```

The development check starts and stops its own preview and dev commands; ports
4367 and 4368 must be free. The diagram check measures rendered text bounds in
both engines for all 68 supported cases. Its screenshots show that the facts
are now visible in an SVG opened on its own. Browser and printable artifact
evidence for the counterexample workflow is in [the main review](../../docs/review.md).
