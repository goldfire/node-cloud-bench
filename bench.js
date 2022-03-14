/*!
 *  node-cloud-bench
 *  https://github.com/goldfire/node-cloud-bench
 *
 *  (c) 2018, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

const fs = require('fs');
const crypto = require('crypto');
const {exec} = require('child_process');
const colors = require('colors');
const opts = require('nomnom').option('nodisk', {flag: true}).parse();
const {UniversalSpeedtest, SpeedUnits} = require('universal-speedtest');

// Prep the speed test.
const universalSpeedtest = new UniversalSpeedtest({
  measureUpload: true,
  downloadUnit: SpeedUnits.MBps,
});

// Check the usage.
const {interval, limit, out, nodisk} = opts;
const isMac = process.platform === 'darwin';
const delay = 3000;
if (!interval || !limit || !out) {
  console.log("Usage: node cloud-bench --interval [seconds] --limit [number] [--nodisk] --out [output file]".yellow.bold);
  return;
}

// Create the empty output file.
fs.writeFileSync(out, 'Time,Download (CDN),Ping,Download,Upload,CPU Time,Read IOPS,Write IOPS,IO Ping');

// Get the high resolution time.
const now = () => {
  const hrtime = process.hrtime();
  return hrtime[0] * 1000000 + hrtime[1] / 1000;
};

// Begin the interval.
let total = 0;
const bench = () => {
  // Check if we've reached the limit.
  if (total >= limit) {
    console.log("WIN - Benchmark complete!".green.bold);
    process.exit();
    return;
  }
  total += 1;

  let output = fs.readFileSync(out, 'utf-8') + '\n' + new Date();

  // Execute the download benchmark (uses various CDN tests).
  const netBench1 = () => {
    let total = 0;
    const urls = [
      'https://cachefly.cachefly.net/100mb.test',
      'https://mirror.nl.leaseweb.net/speedtest/100mb.bin',
      'https://speed.hetzner.de/100MB.bin',
      'https://ping.online.net/100Mo.dat',
      'https://proof.ovh.net/files/100Mb.dat',
    ];

    return Promise.all(urls.map((url) => {
      return new Promise((resolve) => {
        exec(`curl --max-time 10 -so /dev/null -w '%{speed_download}\n' '${url}'`, (err, stdout) => {
          total += parseFloat(stdout) / 1024 / 1024;

          setTimeout(resolve, 5000);
        });
      });
    })).then(() => {
      // Update the values in the data.
      output += `,${total / urls.length}`;

      return new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    });
  };

  // Execute the network benchmark (uses speedtest.net for ping, download & upload).
  const netBench2 = () => {
    return new Promise((resolve) => {
      universalSpeedtest.runCloudflareCom().then((result) => {
        const {ping, downloadSpeed, uploadSpeed} = result;

        // Update the values in the data.
        output += `,${ping},${downloadSpeed},${uploadSpeed}`;

        setTimeout(resolve, delay);
      });
    });
  };

  // Execute the CPU benchmark (this will run various array, hashing, etc operations and time it).
  const cpuBench = () => {
    return new Promise((resolve) => {
      const start = process.hrtime();
      let hashes = [];

      // Generate md5 hashes.
      for (let i = 0; i < 2500000; i += 1) {
        hashes.push(crypto.createHash('sha256').update(`${i}`).digest('hex'));
      }

      // Sort the array alphabetically.
      hashes.sort((a, b) => {
        if (a < b) {
          return -1;
        }
        if (a > b) {
          return 1;
        }

        return 0;
      });

      // Filter out hashes that have an "a" as the first character.
      hashes = hashes.filter(hash => hash[0] !== 'a');

      // Loop through the hashes and splice them from the array.
      for (let i = hashes.length - 1; i >= 0; i -= 1) {
        hashes.splice(i, 1);
      }

      // Add the total time to complete to the output.
      const diff = process.hrtime(start);
      const seconds = (diff[0] * 1e9 + diff[1]) / 1e9;
      output += `,${seconds}`;

      setTimeout(resolve, delay);
    });
  };

  // Execute the disk IO benchmark (random read with fio).
  const diskReadBench = () => {
    if (nodisk) {
      output += ',N/A';
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      exec(`fio --name=randread --ioengine=${isMac ? 'posixaio' : 'libaio'} --direct=1 --bs=4k --iodepth=64 --size=4G --rw=randread --gtod_reduce=1 --output-format=json`, (err, stdout) => {
        const {iops} = JSON.parse(stdout).jobs[0].read;

        // Update the values in the data.
        output += `,${iops}`;

        setTimeout(resolve, delay);
      });
    });
  };

  // Execute the disk IO benchmark (random write with fio).
  const diskWriteBench = () => {
    if (nodisk) {
      output += ',N/A';
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      exec(`fio --name=randwrite --ioengine=${isMac ? 'posixaio' : 'libaio'} --direct=1 --bs=4k --iodepth=64 --size=4G --rw=randwrite --gtod_reduce=1 --output-format=json`, (err, stdout) => {
        const {iops} = JSON.parse(stdout).jobs[0].write;

        // Update the values in the data.
        output += `,${iops}`;

        setTimeout(resolve, delay);
      });
    });
  };

  // Execute the disk ping benchmark (using ioping).
  const diskPingBench = () => {
    if (nodisk) {
      output += ',N/A';
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      exec('ioping -c 10 .', (err, stdout) => {
        const parsed = new RegExp(/ \/\s(.+?)\s\/ /g).exec(stdout);

        // Update the values in the data.
        output += `,${parsed[1]}`;

        setTimeout(resolve, delay);
      });
    });
  };

  // Write the data to the output file.
  const writeData = () => {
    fs.writeFileSync(out, output);
  };

  netBench1()
    .then(netBench2)
    .then(cpuBench)
    .then(diskReadBench)
    .then(diskWriteBench)
    .then(diskPingBench)
    .then(writeData)
    .catch(console.log);
};

// Setup the interval to run the benchmarks.
setInterval(bench, interval * 1000);
bench();

console.log(("Benchmark underway: " + limit + " " + interval + " second intervals.").cyan);
