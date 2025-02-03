const shell = require('shelljs');
const subpackages = require('../subpackages');
const fs = require('fs');

// read output directory from parameters
const outputDir = process.argv[2];

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.cpSync('./dist', `${outputDir}/dist`, { recursive: true });
fs.cpSync('./node_modules', `${outputDir}/node_modules`, { recursive: true });
fs.cpSync('./server', `${outputDir}/server`, { recursive: true });

shell.cp('-r', 'package.json', outputDir);
shell.cp('-r', subpackages, outputDir);