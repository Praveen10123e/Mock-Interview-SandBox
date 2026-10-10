import { LanguageAdapter } from '../LanguageAdapter';
import { ExecutionLanguageConfig, ParameterConfig } from '../ExecutionTypes';
import { TestCase } from '../ExecutionContract';

export class PythonAdapter implements LanguageAdapter {
  buildWrapper(sourceCode: string, testCases: TestCase[], config: ExecutionLanguageConfig): string {
    const funcName = config.functionName;
    const testCasesJson = JSON.stringify(testCases);
    const returnType = config.returnType;

    // Generate argument extraction block positionally
    // e.g. arg_0 = kwargs.get('s') or kwargs.get('0') 
    // Wait, the input might be an object where keys are the parameter names
    
    // We will extract positional args from tc['input'] dict based on config.parameters order.
    const argsExtraction = config.parameters.map((param: ParameterConfig, index: number) => {
      return `arg_${index} = tc['input'].get('${param.name}')`;
    }).join('\n            ');

    const argsList = config.parameters.map((_, i) => `arg_${i}`).join(', ');
    
    // Handling void functions by capturing the modified input parameter
    // Assuming void functions modify the first parameter by reference (in-place)
    const isVoid = returnType === 'void';
    let resultCapture = '';
    
    if (isVoid) {
       resultCapture = `
            main_func(${argsList})
            result = arg_0
       `;
    } else {
       resultCapture = `
            result = main_func(${argsList})
       `;
    }

    return `
import sys
import json
import inspect

# === STUDENT CODE ===
${sourceCode}
# ====================

def __run_tests__():
    test_cases = ${testCasesJson}
    results = []
    
    if '${funcName}' not in globals() or not inspect.isfunction(globals()['${funcName}']):
        print("###NM_ERROR###Could not find function '${funcName}'.")
        return

    main_func = globals()['${funcName}']

    for tc in test_cases:
        try:
            ${argsExtraction}
            
            ${resultCapture}
            
            actual = str(result).replace(" ", "")
            expected_val = tc.get('expectedOutput', tc.get('expected', ''))
            expected = str(expected_val).replace(" ", "")
            passed = actual.lower() == expected.lower()
                
            results.append({
                "passed": passed,
                "input": str(tc['input']),
                "expected": expected_val,
                "actual": str(result)
            })
        except Exception as e:
            results.append({
                "passed": False,
                "input": str(tc['input']),
                "expected": tc.get('expectedOutput', tc.get('expected', '')),
                "actual": "Runtime Error: " + str(e)
            })
            
    print("\\n###NM_RESULTS###" + json.dumps(results))

if __name__ == '__main__':
    __run_tests__()
`;
  }
}
