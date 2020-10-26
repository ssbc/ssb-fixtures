# ssb-fixtures

Work in progress

## Features

- Distribution of message types follows a [real world distribution](https://github.com/arj03/ssb-new-format#message-types)
- Distribution of messages per author follows the [Pareto distribution](https://en.wikipedia.org/wiki/Pareto_distribution) with α=2
- Oldest msg is always `type=post` and contains the text "OLDESTMSG"
- Most recent msg is always `type=post` and contains the text "LATESTMSG"

## TODO

- Pass a `seed` as input and all the generation should be deterministic
- Report stats upon generating the fixture (e.g. how many messages per category)
- Publish first fixture in GitHub releases
- CLI
- Automated tests