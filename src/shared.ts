export class TorxError {

    public message: string;
    public fileName: string;
    public lineNumber: number;
    public columnNumber: number;

    constructor(message: string, columnNumber?: number, lineNumber?: number, fileName?: string) {
        this.message = message;
        this.columnNumber = columnNumber;
        this.lineNumber = lineNumber;
        this.fileName = fileName;
    }

    public toString(): string {
        let output = `TorxError: ${this.message}`;
        if (this.fileName) {
            output += ' at ' + this.fileName;
            if (this.lineNumber) {
                output += ':' + this.lineNumber;
                if (this.columnNumber) {
                    output += ':' + this.columnNumber;
                }
            }
        }
        return output;
    }

    public setLineNumber(lineNumber: number): TorxError {
        this.lineNumber = lineNumber;
        return this;
    }

    public setFileName(fileName: string): TorxError {
        this.fileName = fileName;
        return this;
    }
}