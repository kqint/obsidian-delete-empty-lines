import { DeleteEmptyLinesSettings } from './types';

function isEmptyLine(line: string, settings: DeleteEmptyLinesSettings): boolean {
    if (settings.whitespaceOnlyLinesAsEmpty) {
        return line.trim() === '';
    }
    return line === '';
}

export function processText(text: string, maxEmptyLines: number, settings: DeleteEmptyLinesSettings): string {
    const lines = text.split('\n');
    const processedLines: string[] = [];
    let emptyLineCount = 0;

    for (const line of lines) {
        if (isEmptyLine(line, settings)) {
            emptyLineCount += 1;
            if (emptyLineCount <= maxEmptyLines) {
                processedLines.push('');
            }
        } else {
            emptyLineCount = 0;
            processedLines.push(line);
        }
    }

    let tailEmpty = 0;
    for (let i = processedLines.length - 1; i >= 0; i -= 1) {
        if (isEmptyLine(processedLines[i], settings)) {
            tailEmpty += 1;
        } else {
            break;
        }
    }

    if (tailEmpty > maxEmptyLines) {
        processedLines.splice(processedLines.length - (tailEmpty - maxEmptyLines));
    }

    return processedLines.join('\n');
}
