import { LanguageAdapter } from '../LanguageAdapter';
import { ExecutionLanguageConfig, ParameterConfig, DataType } from '../ExecutionTypes';
import { TestCase } from '../ExecutionContract';
import { convertArgumentForLanguage, isCharArray } from '../LanguageInputAdapter';

export class CppAdapter implements LanguageAdapter {
  private getCppType(type: DataType): string {
    switch (type) {
      case 'int': return 'int';
      case 'float': return 'double';
      case 'boolean': return 'bool';
      case 'string': return 'std::string';
      case 'int[]': return 'std::vector<int>';
      case 'float[]': return 'std::vector<double>';
      case 'boolean[]': return 'std::vector<bool>';
      case 'string[]': return 'std::vector<std::string>';
      case 'void': return 'void';
      default: return 'void*';
    }
  }

  buildWrapper(sourceCode: string, testCases: TestCase[], config: ExecutionLanguageConfig): string {
    const funcName = config.functionName;
    const params = config.parameters || [];
    const returnType = config.returnType;

    let mainBody = `
    std::cout << "\\n###NM_RESULTS###[";
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

        const converted = convertArgumentForLanguage(val, 'cpp', `arg_${paramIdx}_idx${idx}`);
        mainBody += `\n        ${converted.declaration}`;
        args.push(`arg_${paramIdx}_idx${idx}`);

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

      mainBody += `\n        std::string expected_${idx} = "${expectedStr}";`;

      if (isVoid) {
        mainBody += `\n        ${funcName}(${callArgs});`;
        if (isFirstParamCharArr) {
          mainBody += `\n        std::string actual_${idx} = "[";`;
          mainBody += `\n        for (size_t i = 0; i < arg_0_idx${idx}.size(); ++i) {`;
          mainBody += `\n            actual_${idx} += std::string("\\"") + arg_0_idx${idx}[i] + "\\"";`;
          mainBody += `\n            if (i < arg_0_idx${idx}.size() - 1) actual_${idx} += ",";`;
          mainBody += `\n        }`;
          mainBody += `\n        actual_${idx} += "]";`;
        } else if (hasArray) {
          mainBody += `\n        std::string actual_${idx} = "[";`;
          mainBody += `\n        for (size_t i = 0; i < arg_0_idx${idx}.size(); ++i) {`;
          mainBody += `\n            actual_${idx} += std::to_string(arg_0_idx${idx}[i]);`;
          mainBody += `\n            if (i < arg_0_idx${idx}.size() - 1) actual_${idx} += ",";`;
          mainBody += `\n        }`;
          mainBody += `\n        actual_${idx} += "]";`;
        } else {
          mainBody += `\n        std::string actual_${idx} = std::to_string(arg_0_idx${idx});`;
        }
      } else {
        mainBody += `\n        ${this.getCppType(returnType)} res_${idx} = ${funcName}(${callArgs});`;
        mainBody += `\n        std::string actual_${idx};`;
        if (returnType === 'string') {
          mainBody += `\n        actual_${idx} = res_${idx};`;
        } else if (returnType === 'int' || returnType === 'float' || returnType === 'boolean') {
          mainBody += `\n        actual_${idx} = std::to_string(res_${idx});`;
        } else if (hasArray) {
          mainBody += `\n        actual_${idx} = "[";`;
          mainBody += `\n        for (size_t i = 0; i < res_${idx}.size(); ++i) {`;
          mainBody += `\n            actual_${idx} += std::to_string(res_${idx}[i]);`;
          mainBody += `\n            if (i < res_${idx}.size() - 1) actual_${idx} += ",";`;
          mainBody += `\n        }`;
          mainBody += `\n        actual_${idx} += "]";`;
        }
      }

      mainBody += `
        int passed_${idx} = (actual_${idx} == expected_${idx}) ? 1 : 0;
        std::cout << "{\\"passed\\":" << (passed_${idx} ? "true" : "false")
                  << ",\\"input\\":\\"${JSON.stringify(tc.input).replace(/"/g, '\\\\\\"')}\\""
                  << ",\\"expected\\":\\"" << expected_${idx} << "\\""
                  << ",\\"actual\\":\\"" << actual_${idx} << "\\"}";
        ${idx < testCases.length - 1 ? 'std::cout << ",";' : ''}
      `;
    });

    mainBody += `
    std::cout << "]\\n";
    `;

    return `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <unordered_map>
#include <set>
#include <unordered_set>

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
