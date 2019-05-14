var debugInfo = {
	scannedText: "",
	scannedIndex: 0,
	scannedFileName: "",
	getCurrentLine: function () {
		let shortenedText = this.scannedText.slice(0, this.scannedIndex);
		return shortenedText.match(/\n/g).length + 1;
	},
	writeError: function (message) {
		console.log(message + " at " + this.scannedFileName + ":" + this.getCurrentLine());
	}
}

module.exports = function (filePath, input, callback) {

	require('fs').readFile(filePath, function (err, content) {
		if (err) return callback(err);

		debugInfo.scannedFileName = filePath;

		var output = '';
		var rendered = removeComments(content.toString());

		rendered = "output=\`" + render(rendered) + "\`;";

		try {
			with (input)
			// console.log(rendered);
			eval(rendered);
		} catch (err) {
			console.error(err.stack);
		}

		return callback(null, output);
	})
}

function removeComments(string) {
	// Remove all comments @* <comment> *@
	return string.replace(/([^@])?\@\*([\s\S]*?)\*\@/g, '$1');
}

function render(originalText) {
	// If no torx code is present just return
	if (originalText.indexOf('@') == -1) {
		return originalText;
	}

	// Clean backticks
	// text = text.replace(/\`/g, 'XD');
	// text = String.raw(text);

	let outputText = '';
	let scannedIndex = 0;
	let symbolIndex = -1;

	debugInfo.scannedText = originalText;

	// Loop @ chars
	while ((symbolIndex = originalText.indexOf('@', symbolIndex + 1)) >= 0) {

		debugInfo.scannedIndex = symbolIndex;

		switch (originalText.charAt(symbolIndex + 1)) {
			case '{':
				// Code block @{ - }

				outputText += originalText.slice(scannedIndex, symbolIndex) + '\`;';
				scannedIndex = symbolIndex + 2; // @{

				var script = getInsideBrackets(originalText.slice(symbolIndex), '{', '}');
				outputText += script + " output+=\`";

				scannedIndex += script.length + 1;
				symbolIndex = scannedIndex;
				break;

			case '(':
				// Expression group @( - )

				outputText += originalText.slice(scannedIndex, symbolIndex) + '\`+';
				scannedIndex = symbolIndex + 2; //@(

				var script = getInsideBrackets(originalText.slice(symbolIndex), '(', ')');
				outputText += script + '+\`';

				scannedIndex += script.length + 1;
				break;

			case '@':
				// Escape symbol @@

				outputText += originalText.slice(scannedIndex, symbolIndex + 1);
				scannedIndex = symbolIndex + 2;
				symbolIndex++;
				break;

			default:
				// var word = /^(\w+)[\w\.\[\](\(.*\))]*/.exec(text.slice(symbolIndex + 1));
				let word = /(\w+)((?=\.\w)\.\w+)*((?=\(.*\))\(.*\))?((?=\[.*\]).*\])?/.exec(originalText.slice(symbolIndex + 1));

				if (word) {

					if (['function'].indexOf(word[1].toString()) > -1) {
						// Function @function

						outputText += originalText.slice(scannedIndex, symbolIndex) + "\`;";

						// Find first '{' after function ( - )
						var bracketIndex = symbolIndex + originalText.slice(symbolIndex).indexOf('{');

						outputText += originalText.slice(symbolIndex + 1, bracketIndex + 1) + "return `";
						scannedIndex = bracketIndex + 1;

						var functionContent = getInsideBrackets(originalText.slice(bracketIndex), '{', '}');

						// output += render(text.slice(lastIndex, functionOutput)) + '}+var output+=\`';

						outputText += render(functionContent) + "\`}output+=\`";
						scannedIndex += functionContent.length + 1;
						symbolIndex = scannedIndex;
					} else if (['if', 'for', 'while'].indexOf(word[1].toString()) > -1) {
						// Control @if

						outputText += originalText.slice(scannedIndex, symbolIndex) + "\`;";

						// Find '{' after control
						var bracketIndex = symbolIndex + originalText.slice(symbolIndex).indexOf('{');

						outputText += originalText.slice(symbolIndex + 1, bracketIndex + 1) + 'output+=\`';
						scannedIndex = bracketIndex + 1;

						var controlContent = getInsideBrackets(originalText.slice(bracketIndex), '{', '}');

						// output += render(controlOutput) + '\`}output+=\`';
						outputText += render(controlContent);

						scannedIndex += controlContent.length + 1;
						symbolIndex = scannedIndex;

						if (word[1] == 'if') {
							// Includes elseif
							let nextWord = 'else';
							let nextWordIndex = originalText.slice(scannedIndex).indexOf(nextWord);

							// Compensate for } else or }else
							if (nextWordIndex == 0 || nextWordIndex == 1) {

								outputText += "\`;}";

								let bracketIndex = symbolIndex + originalText.slice(symbolIndex).indexOf('{');

								outputText += originalText.slice(symbolIndex, bracketIndex + 1) + "output+=\`";

								let controlContent = getInsideBrackets(originalText.slice(bracketIndex), '{', '}');
								outputText += render(controlContent) + "\`}output+=\`";

								scannedIndex += bracketIndex + controlContent.length + 2;
								symbolIndex = scannedIndex;

							} else {
								outputText += "\`}output+=\`";
							}


						} else {
							outputText += "\`}output+=\`";
						}

					} else {
						// Expression @variable

						outputText += originalText.slice(scannedIndex, symbolIndex) + '\`+' + word[0] + '+\`';
						scannedIndex = symbolIndex + word[0].length + 1;
					}
				} else {
					console.log("Single \"@\" at line " + debugInfo.getCurrentLine());
				}
				break;
		}
	}

	outputText += originalText.slice(scannedIndex);

	return outputText;
}

function getInsideBrackets(text, openBracket, closeBracket) {
	let scanIndex = 0;
	let depth = 0;
	let doubleQoutes = false;
	let singleQoutes = false;

	let firstBracket = text.indexOf(openBracket);

	if (firstBracket == -1) {
		console.error("Missing open bracket \"" + openBracket + "\" at line " + debugInfo.getCurrentLine());
	}

	while (scanIndex <= text.length) {
		let character = text.charAt(scanIndex);

		switch (character) {
			case openBracket:
				if (!doubleQoutes && !singleQoutes) {
					depth++;
				}
				break;
			case closeBracket:
				if (!doubleQoutes && !singleQoutes) {
					depth--;
					if (depth == 0) {
						return text.slice(firstBracket + 1, scanIndex);
					}
				}
				break;
			case "\"":
				if (!singleQoutes) {
					doubleQoutes = !doubleQoutes;
				}
				break;
			case "'":
				if (!doubleQoutes) {
					singleQoutes = !singleQoutes;
				}
				break;
			case "\\":
				// Skip all backslashes
				scanIndex++;
				break;
		}
		scanIndex++;
	}

	debugInfo.writeError("Missing close bracket \"" + closeBracket + "\"");
	return "";
}