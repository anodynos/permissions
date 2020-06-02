// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable one-var */
import * as _ from 'lodash';
import * as prettier from 'prettier';
import * as fs from 'fs';
import * as upath from 'upath';

export const eachWithOnly = (arr: object[], iteratee: (item, onlyMode: boolean) => void) => {
  const onlyMode = _.some(arr, (item: any) => !!item.only);
  _.each(arr, (item) => iteratee(item, onlyMode));
};

// Utils for docs generation from specs

export const DO_NOT_EDIT_NOTICE = (filename) =>
  `
**Important note**: This documentation is generated from integration tests, so the examples execute and are tested against.

**DO NOT EDIT THIS .md FILE - Its generated from \`ts-node ${filename}\`**`;

// this utils code is not pretty :-(

const pretty = (codeTxt: string, prettyOptions = {}, discardBefore = ''): string => {
  let text: string;
  try {
    text = prettier.format(codeTxt, {
      semi: true,
      parser: 'typescript',
      printWidth: 110,
      singleQuote: true,
      trailingComma: 'es5',
      ...prettyOptions,
    });
  } catch (error) {
    // workaround cause jest silences errors inside `it()` statements!
    console.log('prettier error', error);
    console.error('prettier error', error);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  }

  const discardIdx = text.indexOf(discardBefore);
  return discardIdx === -1 ? text : text.slice(discardIdx);
};

// PRINT_MD = true prints .md, false a .js!
// You can then wrap your code around an (async () => {.....})().catch(console.error) and play :-)
const PRINT_MD = true;

export const docs = (text: string): string =>
  `\n${PRINT_MD ? text : `// ${text.split('\n').join('\n// ')}`}`;

export const code = (
  text: string,
  prettyOptions: object | false = {},
  discardBefore?: string
): string => {
  text = prettyOptions ? pretty(text, prettyOptions, discardBefore) : text;

  return (
    (text[0] === '\n' ? '' : '\n') +
    (PRINT_MD
      ? `\n  \`\`\`js\n${text}\n  \`\`\`\n`
      : `${pretty(text, prettyOptions, discardBefore)}`)
  );
};

export const joinAll = (...texts: string[]) => texts.join('\n');

export const fileToText = (dirname, filename, discardBefore = '', asCodePrettyOptions = {}) => {
  const fileTxt = fs.readFileSync(upath.joinSafe(dirname, filename), 'utf8');
  let text = asCodePrettyOptions ? pretty(fileTxt, asCodePrettyOptions) : fileTxt;

  const discardIdx = text.indexOf(discardBefore);
  text = `// file: ${filename}
${discardIdx === -1 ? text : text.slice(discardIdx)}`;

  return asCodePrettyOptions ? code(text, false) : text;
};

// run jest .spec files, outside jest, to produce docs :-)
export const noJestRunner = () => {
  if (typeof jest === 'undefined') {
    const JEST = 'jest';
    // @ts-ignore
    global[JEST] = new Proxy(
      {},
      {
        get: (obj, prop) => _.noop,
      }
    );
  }

  if (typeof describe === 'undefined') {
    const DESCRIBE = 'describe';

    const describeFn = (name, describeBody) => {
      console.log(name);
      describeBody();
    };

    type TCase = string[];
    (describeFn as any).each = (casesTable: TCase[]) => (name, eachBody) => {
      console.log(name);
      _.each(casesTable, (caseArgs) => eachBody(...caseArgs));
    };

    (describeFn as any).only = describeFn; // ie ignore .only
    (describeFn as any).skip = _.noop;

    // @ts-ignore
    global[DESCRIBE] = describeFn;
  }

  if (typeof it == 'undefined') {
    const IT = 'it';
    const itFn = (name, itBody) => console.log(name);
    (itFn as any).only = itFn; // ie ignore .only
    (itFn as any).skip = _.noop;
    // @ts-ignore
    global[IT] = itFn;
  }

  if (typeof beforeEach == 'undefined') {
    const BEFORE_EACH = 'beforeEach';
    global[BEFORE_EACH] = _.noop;
  }

  if (typeof beforeAll == 'undefined') {
    const BEFORE_ALL = 'beforeAll';
    global[BEFORE_ALL] = _.noop;
  }

  if (typeof afterEach == 'undefined') {
    const AFTER_EACH = 'afterEach';
    global[AFTER_EACH] = _.noop;
  }

  if (typeof afterAll == 'undefined') {
    const AFTER_ALL = 'afterEach';
    global[AFTER_ALL] = _.noop;
  }
};
