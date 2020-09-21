import { EOL } from "../fs/eol.ts";
import { assertEquals, assertThrowsAsync } from "../testing/asserts.ts";

import { InvalidDelimiterError, write, WriteOptions } from "./csv_writer.ts";

interface CsvWriterTestCase {
  name: string;
  input: string[][] | object[];
  result?: string;
  options?: WriteOptions;
  error?: Error;
}

const testCases: CsvWriterTestCase[] = [
  {
    name: "Minimal",
    input: [["abc"]],
    result: `abc${EOL.LF}`,
  },
  {
    name: "With comma",
    input: [["a", "b", "c"]],
    result: `a,b,c${EOL.LF}`,
  },
  {
    name: "With other comma separator",
    input: [["a", "b", "c"]],
    result: `a|b|c${EOL.LF}`,
    options: { comma: "|" },
  },
  {
    name: "With other comma separator and empty fields",
    input: [["", "", ""]],
    result: `||${EOL.LF}`,
    options: { comma: "|" },
  },
  {
    name: "With CRLF",
    input: [["a", "b", "c"]],
    result: `a,b,c${EOL.CRLF}`,
    options: { useCRLF: true },
  },
  {
    name: "With CRLF and other comma separator ",
    input: [["a", "b", "c"]],
    result: `a#b#c${EOL.CRLF}`,
    options: { useCRLF: true, comma: "#" },
  },
  {
    name: "Field surrounded by quotes",
    input: [[`"abc"`]],
    result: `"""abc"""${EOL.LF}`,
  },
  {
    name: "Quote in field",
    input: [[`a"b`]],
    result: `"a""b"${EOL.LF}`,
  },
  {
    name: "Field surrounded by quotes with quote in field",
    input: [[`"a"b"`]],
    result: `"""a""b"""${EOL.LF}`,
  },
  {
    name: "Preserve space with quotes",
    input: [[` abc`]],
    result: `" abc"${EOL.LF}`,
  },
  {
    name: "Quote comma",
    input: [[`abc,def`]],
    result: `"abc,def"${EOL.LF}`,
  },
  // GO different {Input: [][]string{{"abc,def"}}, Output: `"abc,def"` + "\n"},
  {
    name: "Quote quotes and comma",
    input: [[`"abc", "def"`]],
    result: `"""abc"", ""def"""${EOL.LF}`,
  },
  {
    name: "Do not quote default comma with comma option",
    input: [[`abc,def`]],
    result: `abc,def${EOL.LF}`,
    options: { comma: "|" },
  },
  {
    name: "Simple two lines",
    input: [[`abc`], [`def`]],
    result: `abc${EOL.LF}def${EOL.LF}`,
  },
  {
    name: "New line in field",
    input: [[`abc${EOL.LF}def`]],
    result: `"abc${EOL.LF}def"${EOL.LF}`,
  },
  // GO {Input: [][]string{{"abc\rdef"}}, Output: "\"abcdef\"\r\n", UseCRLF: true},
  // GO {Input: [][]string{{"abc\rdef"}}, Output: "\"abc\rdef\"\n", UseCRLF: false},
  // {Input: [][]string{{""}}, Output: "\n"},
  {
    name: "Empty field",
    input: [[""]],
    result: `${EOL.LF}`,
  },
  // {Input: [][]string{{"", ""}}, Output: ",\n"},
  {
    name: "Two empty fields",
    input: [["", ""]],
    result: `,${EOL.LF}`,
  },
  // {Input: [][]string{{"", "", ""}}, Output: ",,\n"},
  {
    name: "Three empty fields",
    input: [["", "", ""]],
    result: `,,${EOL.LF}`,
  },
  // {Input: [][]string{{"", "", "a"}}, Output: ",,a\n"},
  {
    name: "Field preceded by empty fields",
    input: [["", "", "a"]],
    result: `,,a${EOL.LF}`,
  },
  // {Input: [][]string{{"", "a", ""}}, Output: ",a,\n"},
  {
    name: "Field enclosed by empty fields",
    input: [["", "a", ""]],
    result: `,a,${EOL.LF}`,
  },
  // {Input: [][]string{{"", "a", "a"}}, Output: ",a,a\n"},
  {
    name: "Empty field with two consecutive fields",
    input: [["", "a", "a"]],
    result: `,a,a${EOL.LF}`,
  },
  // {Input: [][]string{{"a", "", ""}}, Output: "a,,\n"},
  {
    name: "Field with two consecutive empty fields",
    input: [["a", "", ""]],
    result: `a,,${EOL.LF}`,
  },
  // {Input: [][]string{{"a", "", "a"}}, Output: "a,,a\n"},
  {
    name: "Empty field in between",
    input: [["a", "", "a"]],
    result: `a,,a${EOL.LF}`,
  },
  // {Input: [][]string{{"a", "a", ""}}, Output: "a,a,\n"},
  {
    name: "Empty field after two consecutive fields",
    input: [["a", "a", ""]],
    result: `a,a,${EOL.LF}`,
  },
  // {Input: [][]string{{`\.`}}, Output: "\"\\.\"\n"},
  {
    name: "Postgresql special char",
    input: [[`\.`]],
    result: `"\."${EOL.LF}`,
  },
  // {Input: [][]string{{"x09\x41\xb4\x1c", "aktau"}}, Output: "x09\x41\xb4\x1c,aktau\n"},
  {
    name: "Encoded characters unqouted",
    input: [["x09\x41\xb4\x1c", "aktau"]],
    result: `x09\x41\xb4\x1c,aktau${EOL.LF}`,
  },
  // {Input: [][]string{{",x09\x41\xb4\x1c", "aktau"}}, Output: "\",x09\x41\xb4\x1c\",aktau\n"},
  {
    name: "Encoded characters qouted",
    input: [[",x09\x41\xb4\x1c", "aktau"]],
    result: `",x09\x41\xb4\x1c",aktau${EOL.LF}`,
  },
  {
    name: 'Errors - invalid delimiter "',
    input: [[""]],
    options: {comma: '"'},
    error: new InvalidDelimiterError('"'),
  },
  {
    name: 'Errors - invalid delimiter \n',
    input: [[""]],
    options: {comma: '\n'},
    error: new InvalidDelimiterError('\n'),
  },
  {
    name: 'Errors - invalid delimiter \r',
    input: [[""]],
    options: {comma: '\r'},
    error: new InvalidDelimiterError('\r'),
  },
  {
    name: "An array of objects as input",
    input: [{a: 'a', b: 'b'}, {c: 'c', d: 'd'}],
    result: `a,b${EOL.LF}c,d${EOL.LF}`,
  },
];

for (const testCase of testCases) {
  Deno.test({
    name: testCase.name,
    async fn(): Promise<void> {
      if (testCase.error) {
        const err = await assertThrowsAsync(async () => {
          await write(testCase.input, testCase.options);
        });
        assertEquals(err, testCase.error);
      } else {
        const result = await write(testCase.input, testCase.options);
        assertEquals(result.toString(), testCase.result);
      }
    },
  });
}
