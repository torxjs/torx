export function compile(source: string, data: object): Promise<string> {
    const page = new File(source, data);
    return page.getOutput();
}

class File {

    public source: string;
    public data: object;
    public sourceLines: Line[];

    constructor(source: string, data: object) {
        this.source = source;
        this.data = data;
        this.sourceLines = source.split('\n').map(text => new Line(text));
    }

    public getOutput(): Promise<string> {
        return new Promise((resolve, reject) => {
            Promise.all(this.sourceLines.map(line =>
                line.getOutput()
            )).then(output => {
                resolve(output.join('\n'));
            }).catch(error => reject(error));
        });
    }

}

class Line {

    public source: string;

    private output: string;
    private input: string;

    constructor(source: string) {
        this.source = source;
    }

    public getOutput(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.source.indexOf('@') >= 0) {
                this.input = this.source;
                this.output = '';
                let symbolIndex = this.input.indexOf('@');
                this.appendOutput(this.source.substring(0, symbolIndex));
                this.shiftRemainder(symbolIndex);
                while (symbolIndex >= 0) {
                    this.shiftRemainder(1);
                    switch (this.input[0]) {
                        case '@':
                            this.appendOutput('@');
                            this.shiftRemainder(1);
                            break;
                        case '(':
                            // TODO: matching pair
                            break;
                        case '{':
                            break;
                        default:
                            const match = this.input.match(/^\w+/);
                            if (match) {
                                const word = match[0];
                                this.appendOutput(`"${word}"`);
                                this.shiftRemainder(word.length);
                            }
                            break;
                    }
                    symbolIndex = this.input.indexOf('@');
                }
                this.appendOutput(this.input);
                resolve(this.output);
            } else {
                resolve(this.source);
            }
        });
    }

    private appendOutput(text: string): void {
        this.output += text;
    }

    private shiftRemainder(length): void {
        this.input = this.input.substring(length);
    }
}