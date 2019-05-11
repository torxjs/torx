module.exports = function (filePath, input, callback) {
	require('fs').readFile(filePath, function (err, content) {
		if (err) return callback(err)

		// Remove all comments @* <comment> *@
		var rendered = content.toString().replace(/([^@])?\@\*([\s\S]*?)\*\@/g, '$1');

		var output = '';
		rendered = 'output=\`' + render(rendered) + '\`;';

		try {
			with (input)
			// debug(rendered);
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

	// Clean backticks
	// text = text.replace(/\`/g, 'XD');
	// text = String.raw(text);

	// Loop @
	var output = '';
	var lastIndex = 0;
	var symbolIndex = -1;
	var lastControl = '';

	while ((symbolIndex = text.indexOf('@', symbolIndex + 1)) >= 0) {
		// Next character
		switch (text.charAt(symbolIndex + 1)) {
			case '{':
				// Code block

				// debug('Code block');
				output += text.slice(lastIndex, symbolIndex) + '\`;';
				lastIndex = symbolIndex + 2;

				var javascript = getInsideBracket(text.slice(lastIndex), '{', '}');
				output += javascript + ' output+=\`';

				lastIndex += javascript.length + 1;
				symbolIndex = lastIndex;

				// debug(lastControl);


				// if (lastControl == 'if') {
				// 	debug(text.substr(text.indexOf('}', 10)));
				// }
				break;
			case '(':
				// Expression group

				//debug('Expression group');
				output += text.slice(lastIndex, symbolIndex) + '\`+';
				lastIndex = symbolIndex + 2;

				var javascript = getInsideBracket(text.slice(lastIndex), '(', ')');
				output += javascript + '+\`';

				lastIndex += javascript.length + 1;
				break;
			case '@':
				// Escape symbol

				//debug('Escape symbol');
				output += text.slice(lastIndex, symbolIndex + 1);
				lastIndex = symbolIndex + 2;
				symbolIndex++;
				break;
			default:
				// var word = /^(\w+)[\w\.\[\](\(.*\))]*/.exec(text.slice(symbolIndex + 1));
				var word = /(\w+)((?=\.\w)\.\w+)*((?=\(.*\))\(.*\))?((?=\[.*\]).*\])?/.exec(text.slice(symbolIndex + 1));
				// debug(word);
				if (word) {
					if (['function'].indexOf(word[1].toString()) > -1) {
						// Function

						// Output HTML
						output += text.slice(lastIndex, symbolIndex) + '\`;';
						// Find '{' after function
						var functionParams = text.slice(symbolIndex).indexOf('{') + 1;
						// Output function with params
						// debug(' Control: ' + text.slice(symbolIndex, functionParams));
						output += text.slice(symbolIndex + 1, symbolIndex + functionParams) + 'return `';
						lastIndex = symbolIndex + functionParams;
						// Render 
						var functionOutput = getInsideBracket(text.slice(lastIndex), '{', '}');
						// debug(functionOutput);
						// output += render(text.slice(lastIndex, functionOutput)) + '}+var output+=\`';
						output += render(functionOutput) + '\`}output+=\`';
						lastIndex += functionOutput.length + 1;
						symbolIndex = lastIndex;
					} else if (['if', 'for', 'while'].indexOf(word[1].toString()) > -1) {
						// Control

						// debug('Control - ' + word[1]);
						lastControl = word[1].toString();

						// Output HTML
						output += text.slice(lastIndex, symbolIndex) + '\`;';
						// Find '{' after control
						var controlParams = text.slice(symbolIndex).indexOf('{') + 1;
						// Output control with params
						// debug(' Control: ' + text.slice(symbolIndex, controlParams));
						output += text.slice(symbolIndex + 1, symbolIndex + controlParams) + 'output+=\`';
						lastIndex = symbolIndex + controlParams;
						// Render 
						var controlOutput = getInsideBracket(text.slice(lastIndex), '{', '}');
						// debug(controlOutput);
						// output += render(text.slice(lastIndex, controlOutput)) + '}+var output+=\`';

						// output += render(controlOutput) + '\`}output+=\`';
						output += render(controlOutput);

						lastIndex += controlOutput.length + 1;
						symbolIndex = lastIndex;

						if (word[1] == 'if') {
							// Includes elseif
							let nextWord = 'else';
							let nextWordIndex = text.slice(symbolIndex).indexOf(nextWord);

							if (nextWordIndex == 0 || nextWordIndex == 1) {
								// 		debug(text.slice(symbolIndex));

								// 		// debug(text.substr(nextWordIndex, 20));

								// 		// // // Output HTML
								output += '\`;';

								// // Find '{' after 'else'
								var controlParams = text.slice(symbolIndex).indexOf('{') + 1;

								output += '}' + text.slice(symbolIndex, symbolIndex + controlParams) + 'output+=\`';
								// 		//'output+=\`'
								// 		// lastIndex = nextWordIndex + controlParams;

								// debug(text.slice(symbolIndex));
								var controlOutput = getInsideBracket(text.slice(symbolIndex + controlParams), '{', '}');
								// 		// // output += render(text.slice(lastIndex, controlOutput)) + '}+var output+=\`';
								output += render(controlOutput) + '\`}output+=\`';

								lastIndex += controlParams + controlOutput.length + 1;
								symbolIndex = lastIndex;

							} else {
								output += '\`}output+=\`';
							}


						} else {
							output += '\`}output+=\`';
						}

						// debug(output);

					} else {
						// Expression

						// debug('Expression - ' + word);
						output += text.slice(lastIndex, symbolIndex) + '\`+' + word[0] + '+\`';
						lastIndex = symbolIndex + word[0].length + 1;
					}
				} else {
					debug('Lonely @');
				}
				break;
		}
	}

	output += text.slice(lastIndex);
	// debug('Rendered');

	return output;
}

function debug(text) {
	console.log(text);
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
						// debug(text.slice(0, position + 1))
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

function escapeBacktick(code) {
	return code.replace(/\`/g, '\`');
}
