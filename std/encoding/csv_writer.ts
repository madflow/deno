import { EOL } from "../fs/eol.ts";
import { StringWriter } from "../io/writers.ts";
import { encode } from "./utf8.ts";
import { INVALID_RUNE } from "./csv.ts";

/**
 * @property comma - Character which separates values. Default: ','
 * @property useCRLF - True to use \r\n as the line terminator . Default: '\n'
 */
export interface WriteOptions {
  comma?: string;
  useCRLF?: boolean;
}

function fieldNeedsQuote(field: string, comma: string): Boolean {
  if (field === "") {
    return false;
  }

  // For Postgres, quote the data terminating string `\.`.
  if (field == `\.`) {
    return true;
  }

  return (
    field.includes(comma) ||
    field.includes(EOL.LF) ||
    field.includes(EOL.CRLF) ||
    field.includes('"') ||
    field.includes(" ")
  );
}

export class InvalidDelimiterError extends Error {
  constructor(delimiter: string) {
    super();
    this.message = `Invalid delimiter ${delimiter} provided.`;
  }
}

export async function write(
  lines: string[][],
  options: WriteOptions = { comma: ",", useCRLF: false }
): Promise<StringWriter> {
  const comma = options.comma ?? ",";

  if(INVALID_RUNE.includes(comma)) {
    throw new InvalidDelimiterError(comma);
  }

  const writer = new StringWriter();

  for (const line of lines) {
    for (let index = 0; index < line.length; index++) {
      const element = line[index];
      const elementValue: string = element.toString();
      let value;
      if (fieldNeedsQuote(elementValue, comma) === false) {
        value = encode(elementValue);
      } else {
        value = encode(`"${elementValue.replace(/"/g, '""')}"`);
      }
      await writer.write(value);
      if (index < line.length - 1) {
        await writer.write(encode(comma));
      }
    }
    await writer.write(encode(options.useCRLF ? EOL.CRLF : EOL.LF));
  }
  return writer;
}
