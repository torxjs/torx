"use strict";
exports.__esModule = true;
exports.TorxError = void 0;
var TorxError = /** @class */ (function () {
    function TorxError(message, details) {
        this.message = message;
        this.fileName = details.fileName;
        this.columnNumber = details.columnNumber;
        this.lineNumber = details.lineNumber;
        this.source = details.source;
    }
    TorxError.prototype.toString = function () {
        var output = "";
        if (this.source) {
            var lines = this.source.split(/\r?\n/g);
            var line = lines[this.lineNumber - 1];
            var arrow = " ".repeat(this.columnNumber) + "^";
            output += this.getPosition() + "\n";
            output += line + "\n";
            output += arrow + "\n\n";
            output += "TorxError: ".concat(this.message);
        }
        else {
            output += "TorxError: ".concat(this.message);
            if (this.fileName) {
                output += " (".concat(this.getPosition(), ")");
            }
        }
        return output;
    };
    TorxError.prototype.getPosition = function () {
        var output = "";
        if (this.fileName) {
            output += this.fileName;
            if (this.lineNumber) {
                output += ":" + this.lineNumber;
                if (this.columnNumber) {
                    output += ":" + this.columnNumber;
                }
            }
        }
        return output;
    };
    return TorxError;
}());
exports.TorxError = TorxError;
