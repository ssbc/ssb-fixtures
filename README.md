# ssb-fixtures

A generator of fake ("Lorem ipsum") .ssb databases.

```
npx ssb-fixtures --messages=1000 --authors=100
```

## Features

- Distribution of message types follows a [real world distribution](https://github.com/arj03/ssb-new-format#message-types)
- Distribution of messages per author follows the [Pareto distribution](https://en.wikipedia.org/wiki/Pareto_distribution) with α=2
- Generates `post` msgs
- Generates `about` msgs
- Generates `vote` msgs
- Generates `contact` msgs
- Generates private `post` msgs
- Oldest msg is always `type: post` and contains the text "OLDESTMSG"
- Most recent msg is always `type: post` and contains the text "LATESTMSG"

## Versioning

This **does not follow SemVer**. That's because we want to version the datasets primarily, not the code that produces the dataset. This is how we update versions M.m.p:

- `M`: updated when the dataset changes even when parameters `seed`, `messages`, `authors` remain the same
- `m`: updated when the source code and CLI get breaking changes or new features, i.e. noticeable changes
- `p`: update when the source code and CLI receive bug fixes

## TODO

- Run tests in CI
- Publish first fixture in GitHub releases, from CI hopefully
- Store other accounts with their secret too, to recover private messages
- Generate channel messages
- Private threads (currently all private messages are "root")
- Generate "updated" fixture to simulate a second resync
