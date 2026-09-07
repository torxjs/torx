export interface TorxErrorDetails {
   fileName?: string;
   lineNumber?: number;
   columnNumber?: number;
   source?: string;
}

/**
 * Error thrown when a Torx template cannot be parsed or compiled.
 * Carries the file name and position when they are known.
 */
export class TorxError extends Error implements TorxErrorDetails {
   public fileName?: string;
   public lineNumber?: number;
   public columnNumber?: number;
   public source?: string;

   constructor(message: string, details: TorxErrorDetails = {}) {
      super(message);
      this.name = "TorxError";
      this.fileName = details.fileName;
      this.columnNumber = details.columnNumber;
      this.lineNumber = details.lineNumber;
      this.source = details.source;
      Object.setPrototypeOf(this, new.target.prototype);
   }

   public toString(): string {
      let output = "";
      if (this.source && this.lineNumber !== undefined && this.columnNumber !== undefined) {
         const lines = this.source.split(/\r?\n/g);
         const line = lines[this.lineNumber - 1] ?? "";
         const arrow = " ".repeat(this.columnNumber) + "^";
         const position = this.getPosition();
         if (position) {
            output += position + "\n";
         }
         output += line + "\n";
         output += arrow + "\n\n";
         output += `TorxError: ${this.message}`;
      } else {
         output += `TorxError: ${this.message}`;
         const position = this.getPosition();
         if (position) {
            output += ` (${position})`;
         }
      }
      return output;
   }

   /**
    * Format as file:line:column, omitting whatever is unknown.
    */
   public getPosition(): string {
      let output = "";
      if (this.fileName) {
         output += this.fileName;
      }
      if (this.lineNumber !== undefined) {
         output += (output ? ":" : "line ") + this.lineNumber;
         if (this.columnNumber !== undefined) {
            output += ":" + this.columnNumber;
         }
      }
      return output;
   }
}
