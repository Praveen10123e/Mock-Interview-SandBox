import { LanguageAdapter } from '../LanguageAdapter';
import { ExecutionLanguageConfig, ParameterConfig } from '../ExecutionTypes';
import { TestCase } from '../ExecutionContract';

export class JavaScriptAdapter implements LanguageAdapter {
  buildWrapper(sourceCode: string, testCases: TestCase[], config: ExecutionLanguageConfig): string {
    const funcName = config.functionName;
    const testCasesJson = JSON.stringify(testCases);
    const returnType = config.returnType;

    const argsExtraction = config.parameters.map((param: ParameterConfig, index: number) => {
      return `const arg_${index} = tc.input['${param.name}'];`;
    }).join('\n        ');

    const argsList = config.parameters.map((_, i) => `arg_${i}`).join(', ');
    
    const isVoid = returnType === 'void';
    let resultCapture = '';
    
    if (isVoid) {
       resultCapture = `
        ${funcName}(${argsList});
        const result = arg_0;
       `;
    } else {
       resultCapture = `
        const result = ${funcName}(${argsList});
       `;
    }

    return `
// === STUDENT CODE ===
${sourceCode}
// ====================

function __run_tests__() {
    const testCases = ${testCasesJson};
    const results = [];
    
    if (typeof ${funcName} !== 'function') {
        console.log("###NM_ERROR###Could not find function '${funcName}'.");
        return;
    }

    for (const tc of testCases) {
        try {
            ${argsExtraction}
            
            ${resultCapture}
            
            const expectedVal = tc.expectedOutput !== undefined ? tc.expectedOutput : tc.expected;
            
            // Handle arrays/objects nicely for actual and expected comparison
            const actualStr = JSON.stringify(result) || String(result);
            const expectedStr = JSON.stringify(expectedVal) || String(expectedVal);
            
            const passed = actualStr.replace(/\\s+/g, '') === expectedStr.replace(/\\s+/g, '');
                
            results.push({
                passed: passed,
                input: JSON.stringify(tc.input),
                expected: expectedVal,
                actual: actualStr
            });
        } catch (e) {
            results.push({
                passed: false,
                input: JSON.stringify(tc.input),
                expected: tc.expectedOutput !== undefined ? tc.expectedOutput : tc.expected,
                actual: "Runtime Error: " + e.message
            });
        }
    }
            
    console.log("\\n###NM_RESULTS###" + JSON.stringify(results));
}

__run_tests__();
`;
  }
}
