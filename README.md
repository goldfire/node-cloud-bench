## Description
node-cloud-bench is a small CLI utility written with Node.js that allows for easy benchmarking of cloud servers, specifically to test CPU performance, network speeds and disk IOPS. When it comes to cloud computing, seeing how consistent the values are over time is just as important as the values themselves, which is why you can specify an interval, length of the test and a location to output a CSV file with the results.

The results collected include:

* Network CDN Download (Mbps)
* Network Ping (seconds)
* Network Download (Mbps)
* Network Upload (Mbps)
* CPU Time (seconds)
* Read IOPS
* Write IOPS
* I/O Ping

## Installation

```
npm install cloud-bench
```

This script makes use of the following dependencies that you may need to install:

* [fio](https://github.com/axboe/fio)
* [ioping](https://github.com/koct9i/ioping)

## Usage

```bash
node cloud-bench \
    --interval [seconds between tests] \
    --limit [number of iterations] \
    --nodisk
    --out [output filename]
```

The below command will run performance tests every 30 minutes for 24 hours.

```bash
node cloud-bench \
    --interval 1800 \
    --limit 48 \
    --out results.csv
```

Sample output:

| Time | Download (CDN) | Ping | Download | Upload | CPU Time | Read IOPS | Write IOPS | IO Ping |
| ---- | ---- | -------- | ------ | -------- | --------- | ---------- | ------- |
| Mon Apr 02 2018 21:35:05 GMT-0500 (CDT) | 32 | 28 | 49 | 11 | 23.387 | 37936 | 18428 |15.4us |
| ... |

If you are running these tests on a remote machine, it is recommended to pair it with something like [forever](https://github.com/nodejitsu/forever) to turn the test into a daemon.

## License

Copyright (c) 2018 [James Simpson](https://twitter.com/GoldFireStudios) and [GoldFire Studios, Inc.](https://goldfirestudios.com)

Released under the MIT License.