export class TorxError {

    public message: string;
    public fileName: string;
    public lineNumber: number;
    public columnNumber: number;

    constructor(message: string, columnNumber?: number, lineNumber?: number, fileName?: string) {
        this.message = message;
        this.fileName = fileName;
        this.lineNumber = lineNumber;
        this.columnNumber = columnNumber;
    }

    public log() {
        console.log(`TorxError: ${this.message} at ${this.fileName}:${this.lineNumber}:${this.columnNumber}`);
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