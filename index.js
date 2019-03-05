module.exports = function (filePath, input, callback) {
	require('fs').readFile(filePath, function (err, content) {
		if (err) return callback(err)

		// Remove all comments @* <comment> *@
		var rendered = content.toString().replace(/([^@])?\@\*([\s\S]*?)\*\@/g, '$1');

		var output = '';
		rendered = 'output=\`' + render(rendered) + '\`;';

		try {
			with(input)
			eval(rendered);
		} catch (err) {
			console.error(err.stack);
		}

		return callback(null, output);
	})
}

function render(text) {
	// If no torx code is present just return
	if (text.indexOf('@') == -1) {
		return text;
	}

	// Loop all @ symbols
	var output = '';
	var lastIndex = 0;
	var symbolIndex = -1;
	while ((symbolIndex = text.indexOf('@', symbolIndex + 1)) >= 0) {
		// Next char
		switch (text.charAt(symbolIndex + 1)) {
			case '{':
				// Code block
				log('Code block');
				output += text.slice(lastIndex, symbolIndex) + '\`;';
				lastIndex = symbolIndex + 2;

				var javascript = getInsideBracket(text.slice(lastIndex), '{', '}');
				output += javascript + ' output+=\`';

				lastIndex += javascript.length + 1;
				symbolIndex = lastIndex;
				break;
			case '(':
				// Expression Group
				log('Expression group');
				output += text.slice(lastIndex, symbolIndex) + '\`+';
				lastIndex = symbolIndex + 2;

				var javascript = getInsideBracket(text.slice(lastIndex), '(', ')');
				output += javascript + '+\`';

				lastIndex += javascript.length + 1;
				break;
				// case '[':
				//     // Comment
				//     log('Comment');

				//     output += text.slice(lastIndex, symbolIndex);
				//     lastIndex = symbolIndex + 2;

				//     var comment = getInsideBracket(text.slice(lastIndex), '[', ']');

				//     lastIndex += comment.length + 1;
				break;
			case '@':
				// Escape symbol
				log('Escape symbol');
				output += text.slice(lastIndex, symbolIndex + 1);
				lastIndex = symbolIndex + 2;
				symbolIndex++;
				break;
			default:
				var word = /^(\w+)[\w\.\[\]\(\)]*/.exec(text.slice(symbolIndex + 1));
				// log(word);
				if (word) {
					if (['if', 'for', 'while'].indexOf(word[1].toString()) > -1) {
						// Function
						log('Function - ' + word[1]);

						// Output HTML
						output += text.slice(lastIndex, symbolIndex) + '\`;';
						// Find '{' after function
						var functionParams = text.slice(symbolIndex).indexOf('{') + 1;
						// Output function with params
						output += text.slice(symbolIndex + 1, symbolIndex + functionParams) + 'output+=\`';
						lastIndex = symbolIndex + functionParams;
						// Render 
						var functionOutput = getInsideBracket(text.slice(lastIndex), '{', '}');
						// log(functionOutput);
						// output += render(text.slice(lastIndex, functionOutput)) + '}+var output+=\`';
						output += render(functionOutput) + '\`}output+=\`';
						lastIndex += functionOutput.length + 1;
						symbolIndex = lastIndex;
					} else {
						// Expression
						log('Expression - ' + word[0]);

						output += text.slice(lastIndex, symbolIndex) + '\`+' + word[0] + '+\`';
						lastIndex = symbolIndex + word[0].length + 1;
					}
				} else {
					log('Lonely @');
				}
				break;
		}
	}

	output += text.slice(lastIndex);
	// log('Rendered');

	return output;
}

function log(text) {
	// console.log(text);
}

function getInsideBracket(text, openBracket, closeBracket) {
	var position = 0,
		depth = 1,
		doubleQoutes = false,
		singleQoutes = false;

	while (position <= text.length) {
		var char = text.charAt(position);

		switch (char) {
			case openBracket:
				if (!doubleQoutes && !singleQoutes) {
					depth++;
				}
				break;
			case closeBracket:
				if (!doubleQoutes && !singleQoutes) {
					depth--
					if (depth == 0) {
						// log(text.slice(0, position + 1))
						return text.slice(0, position);
					}
				}
				break;
			case '"':
				if (!singleQoutes) {
					doubleQoutes = !doubleQoutes;
				}
				break;
			case "'":
				if (!doubleQoutes) {
					singleQoutes = !singleQoutes;
				}
				break;
			case '\\':
				// Skip all backslashes
				position++;
				break;
		}
		position++;
	}

	console.error('No matching brackets found in: \n' + text)
	return '';
}