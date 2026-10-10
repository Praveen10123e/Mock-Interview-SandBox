import { LanguageAdapter } from '../LanguageAdapter';
import { ExecutionLanguageConfig, ParameterConfig, DataType } from '../ExecutionTypes';
import { TestCase } from '../ExecutionContract';
import { convertArgumentForLanguage, isCharArray } from '../LanguageInputAdapter';

export class CAdapter implements LanguageAdapter {
  private getCType(type: DataType): string {
    switch (type) {
      case 'int': return 'int';
      case 'float': return 'double';
      case 'boolean': return 'int';
      case 'string': return 'char*';
      case 'int[]': return 'int*';
      case 'float[]': return 'double*';
      case 'boolean[]': return 'int*';
      case 'string[]': return 'char**';
      case 'void': return 'void';
      default: return 'void*';
    }
  }

  buildWrapper(sourceCode: string, testCases: TestCase[], config: ExecutionLanguageConfig): string {
    const funcName = config.functionName;
    const params = config.parameters || [];
    const returnType = config.returnType;

    let mainBody = `
    printf("\\n###NM_RESULTS###[");
    `;

    testCases.forEach((tc, idx) => {
      const args: string[] = [];
      let isFirstParamCharArr = false;

      params.forEach((p: ParameterConfig, paramIdx: number) => {
        let val = tc.input;
        if (typeof tc.input === 'object' && tc.input !== null && tc.input[p.name] !== undefined) {
          val = tc.input[p.name];
        } else if (typeof tc.input === 'object' && tc.input !== null && tc.input[`arg${paramIdx}`] !== undefined) {
          val = tc.input[`arg${paramIdx}`];
        }

        const converted = convertArgumentForLanguage(val, 'c', `arg_${paramIdx}_idx${idx}`);
        mainBody += `\n            ${converted.declaration}`;

        args.push(`arg_${paramIdx}_idx${idx}`);
        if (p.type.endsWith('[]') || converted.type.endsWith('*') || converted.type.endsWith('[]')) {
          if (converted.length !== undefined) {
            args.push(`arg_${paramIdx}_idx${idx}Size`);
          }
        }
        if (paramIdx === 0 && isCharArray(val)) {
          isFirstParamCharArr = true;
        }
      });

      const callArgs = args.join(', ');

      let expectedStr = typeof (tc.expectedOutput ?? tc.expected) === 'string'
        ? (tc.expectedOutput ?? tc.expected)
        : JSON.stringify(tc.expectedOutput ?? tc.expected);
      expectedStr = expectedStr.replace(/\s/g, '').replace(/"/g, '\\"');

      const isVoid = returnType === 'void';
      const hasArray = returnType.endsWith('[]') || (isVoid && (params[0]?.type?.endsWith('[]') || isFirstParamCharArr));

      mainBody += `\n            char* expected_${idx} = "${expectedStr}";`;

      if (isVoid) {
        mainBody += `\n            ${funcName}(${callArgs});`;
        if (isFirstParamCharArr) {
          mainBody += `\n            char actual_${idx}[1024] = "[";`;
          mainBody += `\n            for (int i = 0; i < arg_0_idx${idx}Size; i++) {`;
          mainBody += `\n                char temp[32];`;
          mainBody += `\n                snprintf(temp, sizeof(temp), "\\"%c\\"", arg_0_idx${idx}[i]);`;
          mainBody += `\n                strcat(actual_${idx}, temp);`;
          mainBody += `\n                if (i < arg_0_idx${idx}Size - 1) strcat(actual_${idx}, ",");`;
          mainBody += `\n            }`;
          mainBody += `\n            strcat(actual_${idx}, "]");`;
        } else if (hasArray) {
          mainBody += `\n            char actual_${idx}[1024] = "[";`;
          mainBody += `\n            for (int i = 0; i < arg_0_idx${idx}Size; i++) {`;
          mainBody += `\n                char temp[32];`;
          if (params[0]?.type === 'float[]') {
            mainBody += `\n                snprintf(temp, sizeof(temp), "%g", arg_0_idx${idx}[i]);`;
          } else {
            mainBody += `\n                snprintf(temp, sizeof(temp), "%d", arg_0_idx${idx}[i]);`;
          }
          mainBody += `\n                strcat(actual_${idx}, temp);`;
          mainBody += `\n                if (i < arg_0_idx${idx}Size - 1) strcat(actual_${idx}, ",");`;
          mainBody += `\n            }`;
          mainBody += `\n            strcat(actual_${idx}, "]");`;
        } else {
          mainBody += `\n            char actual_${idx}[1024];`;
          mainBody += `\n            snprintf(actual_${idx}, sizeof(actual_${idx}), "%s", arg_0_idx${idx});`;
        }
      } else {
        mainBody += `\n            ${this.getCType(returnType)} res_${idx} = ${funcName}(${callArgs});`;
        mainBody += `\n            char actual_${idx}[1024];`;
        if (returnType === 'string') {
          mainBody += `\n            snprintf(actual_${idx}, sizeof(actual_${idx}), "%s", res_${idx} ? res_${idx} : "");`;
        } else if (returnType === 'int' || returnType === 'boolean') {
          mainBody += `\n            snprintf(actual_${idx}, sizeof(actual_${idx}), "%d", res_${idx});`;
        } else if (returnType === 'float') {
          mainBody += `\n            snprintf(actual_${idx}, sizeof(actual_${idx}), "%g", res_${idx});`;
        }
      }

      mainBody += `
            int passed_${idx} = strcmp(actual_${idx}, expected_${idx}) == 0 ? 1 : 0;
            printf("{\\"passed\\":%s,\\"input\\":\\"${JSON.stringify(tc.input).replace(/"/g, '\\\\\\"')}\\",\\"expected\\":\\"%s\\",\\"actual\\":\\"%s\\"}", passed_${idx} ? "true" : "false", expected_${idx}, actual_${idx});
            ${idx < testCases.length - 1 ? 'printf(",");' : ''}
      `;
    });

    mainBody += `
    printf("]\\n");
    `;

    return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// === STUDENT CODE ===
${sourceCode}
// ====================

int main() {
${mainBody}
    return 0;
}
`;
  }
}
