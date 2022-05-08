interface TorxErrorDetails {
   fileName?: string;
   lineNumber?: number;
   columnNumber?: number;
   source?: string;
}

export class TorxError implements TorxErrorDetails {
   public message: string;
   public fileName: string;
   public lineNumber: number;
   public columnNumber: number;
   public source: string;

   constructor(message: string, details?: TorxErrorDetails) {
      this.message = message;
      this.fileName = details.fileName;
      this.columnNumber = details.columnNumber;
      this.lineNumber = details.lineNumber;
      this.source = details.source;
   }

   public toString(): string {
      let output = "";
      if (this.source) {
         const lines = this.source.split(/\r?\n/g);
         const line = lines[this.lineNumber - 1];
         const arrow = " ".repeat(this.columnNumber) + "^";
         output += this.getPosition() + "\n";
         output += line + "\n";
         output += arrow + "\n\n";
         output += `TorxError: ${this.message}`;
      } else {
         output += `TorxError: ${this.message}`;
         if (this.fileName) {
            output += ` (${this.getPosition()})`;
         }
      }
      return output;
   }

   private getPosition(): string {
      let output = "";
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
   }
}
