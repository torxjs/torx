const torx = require('../')

const output = torx.renderFile('example.torx', { title: 'Example Title' })

console.log(output)