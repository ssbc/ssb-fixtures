# ssb-fixtures

Work in progress

## Features

- Distribution of message types follows a [real world distribution](https://github.com/arj03/ssb-new-format#message-types)
- Distribution of messages per author follows the [Pareto distribution](https://en.wikipedia.org/wiki/Pareto_distribution) with α=2
- Oldest msg is always `type=post` and contains the text "OLDESTMSG"
- Most recent msg is always `type=post` and contains the text "LATESTMSG"

## TODO

- Publish first fixture in GitHub releases
- Automated tests