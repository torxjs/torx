interface TorxErrorDetails {
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
    source?: string;
}
export declare class TorxError implements TorxErrorDetails {
    message: string;
    fileName: string;
    lineNumber: number;
    columnNumber: number;
    source: string;
    constructor(message: string, details?: TorxErrorDetails);
    toString(): string;
    getPosition(): string;
}
export {};
