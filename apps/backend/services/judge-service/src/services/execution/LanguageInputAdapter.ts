export type SupportedLanguage = 'c' | 'cpp' | 'java' | 'python' | 'javascript';

export interface ConvertedArgument {
  literal: string;
  declaration: string;
  varName: string;
  type: string;
  length?: number;
  rows?: number;
  cols?: number;
}

export interface LanguageAdapterResult {
  arguments: ConvertedArgument[];
  declarationsCode: string;
  callArgs: string;
  stdin: string;
}

/**
 * Escapes characters safely for C/C++/Java string literals.
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Escapes single character for C/C++/Java char literal.
 */
function escapeChar(c: string): string {
  if (c === "'") return "\\'";
  if (c === '\\') return '\\\\';
  if (c === '\n') return '\\n';
  if (c === '\r') return '\\r';
  if (c === '\t') return '\\t';
  return c;
}

/**
 * Checks if a value is a character array (e.g. ["h", "e", "l", "l", "o"])
 */
export function isCharArray(val: any): boolean {
  return (
    Array.isArray(val) &&
    val.length > 0 &&
    val.every((item) => typeof item === 'string' && item.length === 1)
  );
}

/**
 * Checks if a value is a 2D array (e.g. [[1, 3], [2, 6]])
 */
export function is2DArray(val: any): boolean {
  return Array.isArray(val) && val.length > 0 && val.every((item) => Array.isArray(item));
}

/**
 * Universal Language Input Adapter:
 * Converts logical JavaScript/JSON values into native language representations.
 */
export function convertArgumentForLanguage(
  value: any,
  language: string,
  varName: string = 'arg'
): ConvertedArgument {
  const lang = language.toLowerCase();

  // 1. Null / Undefined
  if (value === null || value === undefined) {
    if (lang === 'c') {
      return { literal: 'NULL', declaration: `void* ${varName} = NULL;`, varName, type: 'void*' };
    }
    if (lang === 'cpp') {
      return { literal: 'nullptr', declaration: `void* ${varName} = nullptr;`, varName, type: 'void*' };
    }
    if (lang === 'java') {
      return { literal: 'null', declaration: `Object ${varName} = null;`, varName, type: 'Object' };
    }
    if (lang === 'python') {
      return { literal: 'None', declaration: `${varName} = None`, varName, type: 'None' };
    }
    return { literal: 'null', declaration: `const ${varName} = null;`, varName, type: 'null' };
  }

  // 2. Character Arrays (e.g. ["h", "e", "l", "l", "o"])
  if (isCharArray(value)) {
    const chars = value as string[];
    const charLiterals = chars.map((c) => `'${escapeChar(c)}'`).join(', ');

    if (lang === 'c') {
      return {
        literal: `{${charLiterals}}`,
        declaration: `char ${varName}[] = {${charLiterals}};\nint ${varName}Size = ${chars.length};`,
        varName,
        type: 'char*',
        length: chars.length,
      };
    }
    if (lang === 'cpp') {
      return {
        literal: `std::vector<char>{${charLiterals}}`,
        declaration: `std::vector<char> ${varName} = {${charLiterals}};`,
        varName,
        type: 'std::vector<char>',
        length: chars.length,
      };
    }
    if (lang === 'java') {
      return {
        literal: `new char[]{${charLiterals}}`,
        declaration: `char[] ${varName} = new char[]{${charLiterals}};`,
        varName,
        type: 'char[]',
        length: chars.length,
      };
    }
    if (lang === 'python') {
      return {
        literal: JSON.stringify(chars),
        declaration: `${varName} = ${JSON.stringify(chars)}`,
        varName,
        type: 'list',
        length: chars.length,
      };
    }
    return {
      literal: JSON.stringify(chars),
      declaration: `const ${varName} = ${JSON.stringify(chars)};`,
      varName,
      type: 'Array',
      length: chars.length,
    };
  }

  // 3. 2D / Nested Arrays (e.g. [[1, 3], [2, 6], [8, 10]])
  if (is2DArray(value)) {
    const rows = value.length;
    const cols = value[0]?.length || 0;
    const isNum = value.every((row: any[]) => row.every((x) => typeof x === 'number'));

    if (lang === 'c') {
      const cRows = value
        .map((row: any[]) => `{${row.map((x) => (typeof x === 'string' ? `"${escapeString(x)}"` : x)).join(', ')}}`)
        .join(', ');
      const elemType = isNum ? 'int' : 'char*';
      return {
        literal: `{${cRows}}`,
        declaration: `${elemType} ${varName}[${rows}][${cols || 1}] = {${cRows}};\nint ${varName}Rows = ${rows};\nint ${varName}Cols = ${cols};`,
        varName,
        type: `${elemType}**`,
        rows,
        cols,
      };
    }
    if (lang === 'cpp') {
      const cppRows = value
        .map((row: any[]) => `{${row.map((x) => (typeof x === 'string' ? `"${escapeString(x)}"` : x)).join(', ')}}`)
        .join(', ');
      const elemType = isNum ? 'int' : 'std::string';
      return {
        literal: `std::vector<std::vector<${elemType}>>{${cppRows}}`,
        declaration: `std::vector<std::vector<${elemType}>> ${varName} = {${cppRows}};`,
        varName,
        type: `std::vector<std::vector<${elemType}>>`,
        rows,
        cols,
      };
    }
    if (lang === 'java') {
      const jRows = value
        .map((row: any[]) => `{${row.map((x) => (typeof x === 'string' ? `"${escapeString(x)}"` : x)).join(', ')}}`)
        .join(', ');
      const elemType = isNum ? 'int' : 'String';
      return {
        literal: `new ${elemType}[][]{${jRows}}`,
        declaration: `${elemType}[][] ${varName} = new ${elemType}[][]{${jRows}};`,
        varName,
        type: `${elemType}[][]`,
        rows,
        cols,
      };
    }
    if (lang === 'python') {
      return {
        literal: JSON.stringify(value),
        declaration: `${varName} = ${JSON.stringify(value)}`,
        varName,
        type: 'list',
        rows,
        cols,
      };
    }
    return {
      literal: JSON.stringify(value),
      declaration: `const ${varName} = ${JSON.stringify(value)};`,
      varName,
      type: 'Array',
      rows,
      cols,
    };
  }

  // 4. Empty Array ([])
  if (Array.isArray(value) && value.length === 0) {
    if (lang === 'c') {
      return {
        literal: '{}',
        declaration: `int* ${varName} = NULL;\nint ${varName}Size = 0;`,
        varName,
        type: 'int*',
        length: 0,
      };
    }
    if (lang === 'cpp') {
      return {
        literal: 'std::vector<int>{}',
        declaration: `std::vector<int> ${varName} = {};`,
        varName,
        type: 'std::vector<int>',
        length: 0,
      };
    }
    if (lang === 'java') {
      return {
        literal: 'new int[]{}',
        declaration: `int[] ${varName} = new int[]{};`,
        varName,
        type: 'int[]',
        length: 0,
      };
    }
    if (lang === 'python') {
      return {
        literal: '[]',
        declaration: `${varName} = []`,
        varName,
        type: 'list',
        length: 0,
      };
    }
    return {
      literal: '[]',
      declaration: `const ${varName} = [];`,
      varName,
      type: 'Array',
      length: 0,
    };
  }

  // 5. 1D Arrays of Numbers or Strings (e.g. [1, 2, 3, 4], [-1, -5, 10], ["apple", "banana"])
  if (Array.isArray(value)) {
    const isNum = value.every((x) => typeof x === 'number');
    const isStr = value.every((x) => typeof x === 'string');

    if (lang === 'c') {
      const elemType = isNum ? 'int' : isStr ? 'char*' : 'void*';
      const items = value.map((x) => (typeof x === 'string' ? `"${escapeString(x)}"` : x)).join(', ');
      return {
        literal: `{${items}}`,
        declaration: `${elemType} ${varName}[] = {${items}};\nint ${varName}Size = ${value.length};`,
        varName,
        type: `${elemType}*`,
        length: value.length,
      };
    }
    if (lang === 'cpp') {
      const elemType = isNum ? 'int' : isStr ? 'std::string' : 'void*';
      const items = value.map((x) => (typeof x === 'string' ? `"${escapeString(x)}"` : x)).join(', ');
      return {
        literal: `std::vector<${elemType}>{${items}}`,
        declaration: `std::vector<${elemType}> ${varName} = {${items}};`,
        varName,
        type: `std::vector<${elemType}>`,
        length: value.length,
      };
    }
    if (lang === 'java') {
      const elemType = isNum ? 'int' : isStr ? 'String' : 'Object';
      const items = value.map((x) => (typeof x === 'string' ? `"${escapeString(x)}"` : x)).join(', ');
      return {
        literal: `new ${elemType}[]{${items}}`,
        declaration: `${elemType}[] ${varName} = new ${elemType}[]{${items}};`,
        varName,
        type: `${elemType}[]`,
        length: value.length,
      };
    }
    if (lang === 'python') {
      return {
        literal: JSON.stringify(value),
        declaration: `${varName} = ${JSON.stringify(value)}`,
        varName,
        type: 'list',
        length: value.length,
      };
    }
    return {
      literal: JSON.stringify(value),
      declaration: `const ${varName} = ${JSON.stringify(value)};`,
      varName,
      type: 'Array',
      length: value.length,
    };
  }

  // 6. Strings (e.g. "hello", "")
  if (typeof value === 'string') {
    const escaped = escapeString(value);
    if (lang === 'c') {
      return {
        literal: `"${escaped}"`,
        declaration: `char* ${varName} = "${escaped}";`,
        varName,
        type: 'char*',
      };
    }
    if (lang === 'cpp') {
      return {
        literal: `std::string("${escaped}")`,
        declaration: `std::string ${varName} = "${escaped}";`,
        varName,
        type: 'std::string',
      };
    }
    if (lang === 'java') {
      return {
        literal: `"${escaped}"`,
        declaration: `String ${varName} = "${escaped}";`,
        varName,
        type: 'String',
      };
    }
    if (lang === 'python') {
      return {
        literal: JSON.stringify(value),
        declaration: `${varName} = ${JSON.stringify(value)}`,
        varName,
        type: 'str',
      };
    }
    return {
      literal: JSON.stringify(value),
      declaration: `const ${varName} = ${JSON.stringify(value)};`,
      varName,
      type: 'string',
    };
  }

  // 7. Booleans (true / false)
  if (typeof value === 'boolean') {
    if (lang === 'c') {
      return {
        literal: value ? '1' : '0',
        declaration: `int ${varName} = ${value ? 1 : 0};`,
        varName,
        type: 'int',
      };
    }
    if (lang === 'cpp') {
      return {
        literal: value ? 'true' : 'false',
        declaration: `bool ${varName} = ${value ? 'true' : 'false'};`,
        varName,
        type: 'bool',
      };
    }
    if (lang === 'java') {
      return {
        literal: value ? 'true' : 'false',
        declaration: `boolean ${varName} = ${value ? 'true' : 'false'};`,
        varName,
        type: 'boolean',
      };
    }
    if (lang === 'python') {
      return {
        literal: value ? 'True' : 'False',
        declaration: `${varName} = ${value ? 'True' : 'False'}`,
        varName,
        type: 'bool',
      };
    }
    return {
      literal: value ? 'true' : 'false',
      declaration: `const ${varName} = ${value ? 'true' : 'false'};`,
      varName,
      type: 'boolean',
    };
  }

  // 8. Numbers (Integers, Floats, Negative numbers)
  if (typeof value === 'number') {
    const isFloat = !Number.isInteger(value);
    if (lang === 'c') {
      const numType = isFloat ? 'double' : 'int';
      return {
        literal: String(value),
        declaration: `${numType} ${varName} = ${value};`,
        varName,
        type: numType,
      };
    }
    if (lang === 'cpp') {
      const numType = isFloat ? 'double' : 'int';
      return {
        literal: String(value),
        declaration: `${numType} ${varName} = ${value};`,
        varName,
        type: numType,
      };
    }
    if (lang === 'java') {
      const numType = isFloat ? 'double' : 'int';
      return {
        literal: String(value),
        declaration: `${numType} ${varName} = ${value};`,
        varName,
        type: numType,
      };
    }
    if (lang === 'python') {
      return {
        literal: String(value),
        declaration: `${varName} = ${value}`,
        varName,
        type: isFloat ? 'float' : 'int',
      };
    }
    return {
      literal: String(value),
      declaration: `const ${varName} = ${value};`,
      varName,
      type: 'number',
    };
  }

  // 9. Fallback / Objects
  return {
    literal: JSON.stringify(value),
    declaration: `/* object */ ${varName} = ${JSON.stringify(value)};`,
    varName,
    type: 'object',
  };
}

/**
 * Builds native language setup code and arguments for a list of logical arguments.
 */
export function buildLanguageSetup(
  executionArgs: any[],
  language: string
): LanguageAdapterResult {
  const converted = executionArgs.map((arg, idx) =>
    convertArgumentForLanguage(arg, language, `arg${idx}`)
  );

  const declarationsCode = converted.map((c) => c.declaration).join('\n');
  const callArgs = converted.map((c) => c.varName).join(', ');

  let stdin = '';
  if (executionArgs.length === 1) {
    const arg = executionArgs[0];
    stdin = typeof arg === 'string' ? arg : JSON.stringify(arg);
  } else {
    stdin = executionArgs
      .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
      .join('\n');
  }

  return {
    arguments: converted,
    declarationsCode,
    callArgs,
    stdin,
  };
}
