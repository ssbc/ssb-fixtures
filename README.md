# ssb-fixtures

A generator of fake ("Lorem ipsum") .ssb databases.

```
npx ssb-fixtures --messages=1000 --authors=100
```

## Usage

```
ssb-fixtures [opts]

Options:
  --help       Show help                                               [boolean]
  --version    Show version number                                     [boolean]
  --seed       String for deterministic generation
  --messages   Num of msgs to generate                          [default: 10000]
  --authors    Num of feeds to generate                           [default: 150]
  --outputDir  Directory for the output fixture                [default: ./data]
  --slim       Keep only essential flume files in the fixture    [default: true]
  --report     Create a report.md file in the fixture            [default: true]
  --latestmsg  1-based index position of the LATESTMSG
  --verbose    Print all generated msgs to stdout               [default: false]
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
- Can generate an "extended" fixture
  - `npx ssb-fixtures --seed=foo --messages=1050 --authors=100 --latestmsg=1000` contains 50 more new messages more than `npx ssb-fixtures --seed=foo --messages=1000 --authors=100`

## Versioning

This **does not follow SemVer**. That's because we want to version the datasets primarily, not the code that produces the dataset. This is how we update versions M.m.p:

- `M`: updated when the dataset changes even when parameters `seed`, `messages`, `authors` remain the same
- `m`: updated when the source code and CLI get breaking changes or new features, i.e. noticeable changes
- `p`: update when the source code and CLI receive bug fixes

## TODO

- Fix `npx` usage
- Store other accounts with their secret too, to recover private messages
- Run tests in CI
- Publish first fixture in GitHub releases, from CI hopefully
- Tell what's happening, in stdout
- Generate channel messages
- Private threads (currently all private messages are "root")
