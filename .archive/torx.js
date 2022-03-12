/**
 * Created by Slulego 12.13.2020
 */

'use strict';

const torx = require('..')

// torx.config({ debug: false })

var successful = 0
var failed = 0
var tests = [

    compare('Implicit only',
        'Johnny Appleseed',
        '@name',
        { name: 'Johnny Appleseed' }),

    compare('Explicit only',
        'Johnny Appleseed',
        '@(name)',
        { name: 'Johnny Appleseed' }),

    compare('Implicit with context',
        '<span>Johnny Appleseed</span>',
        '<span>@name</span>',
        { name: 'Johnny Appleseed' }),

    compare('Implicit inside parentheses',
        '<span style="background: url(images/photo.png)"></span>',
        '<span style="background: url(@image)"></span>',
        { image: 'images/photo.png' }),

    compare('Explicit inside parentheses',
        '<span style="background: url(images/photo.png)"></span>',
        '<span style="background: url(@(image))"></span>',
        { image: 'images/photo.png' }),

    compare('Explicit with context',
        '<span>Johnny Appleseed</span>',
        '<span>@(name)</span>',
        { name: 'Johnny Appleseed' }),

    compare('Empty function',
        '<span>Johnny Appleseed</span>',
        '<span>@getName()</span>',
        { getName: function () { return 'Johnny Appleseed' } }),

    compare('Function',
        '<span>JOHNNY APPLESEED</span>',
        '<span>@upperCase("Johnny Appleseed")</span>',
        { upperCase: function (string) { return string.toUpperCase() } }),

    compare('Function with quotes',
        '<span>JOHNNY (APPLESEED)</span>',
        '<span>@upperCase("Johnny (Appleseed)")</span>',
        { upperCase: function (string) { return string.toUpperCase() } }),


    compare('Function with unmatched parentheses',
        '<span>JOHNNY APPLESEED)</span>',
        '<span>@upperCase("Johnny Appleseed)")</span>',
        { upperCase: function (string) { return string.toUpperCase() } }),


    compare('Function with unmatched quotes',
        `<span>JOHNNY'S APPLESEED</span>`,
        "<span>@html.raw(upperCase('Johnny\\'s Appleseed'))</span>",
        { upperCase: function (string) { return string.toUpperCase() } }),

    compare('Array',
        '<span>J</span>',
        '<span>@name[0]</span>',
        { name: 'Johnny Appleseed' }),

    compare('Double array',
        '<span>J</span>',
        '<span>@names[0][0]</span>',
        { names: ['Johnny Appleseed'] }),

    compare('Double function',
        '<span>John</span>',
        '<span>@getShortName("Johnny Appleseed")(4)</span>',
        {
            getShortName: function (name) {
                return function (length) {
                    return name.substring(0, length)
                }
            }
        }),

    compare('Sub variables',
        '<span>Johnny</span>',
        '<span>@fullName.firstName</span>',
        {
            fullName: {
                firstName: 'Johnny',
                lastName: 'Appleseed'
            }
        })

]

/**
 * Log the expected result and the actual result.
 * @param {string} caption 
 * @param {string} expected 
 * @param {string} script 
 * @param {object} data
 * @return {boolean}
 */

function compare(caption, expected, script, data) {

    let indent = '  '

    try {
        torx.compile(script).call(
            { layout: null },
            data,
            function (error, output) {
                // if (error) console.log(error)

                if (output === expected) {
                    console.log('\x1b[32m%s\x1b[0m', caption)
                    console.log(indent + script + '\n')
                } else {
                    console.log('\x1b[31m%s\x1b[0m', caption)
                    console.log(indent + 'Script:   ', script)
                    console.log(indent + 'Output:   ', output)
                    console.log(indent + 'Expected: ', expected + '\n')
                }

                result(output === expected)
            })
    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', caption)
        console.log(indent + script)
        console.log(indent + error + '\n')
        result(false)
    }
}

/**
 * Tally results.
 * @param {boolean} success 
 */

function result(success) {

    if (success) {
        successful++
    } else {
        failed++
    }

    let total = successful + failed

    if (typeof tests != 'undefined') {
        if (total === tests.length) {
            if (failed === 0) {
                console.log('\x1b[32m%s\x1b[0m', successful + '/' + total + ' tests successful.\n')
            } else {
                console.log('\x1b[31m%s\x1b[0m', failed + '/' + total + ' tests failed.\n')
            }
        }
    }
}
