import { LanguageAdapter } from '../LanguageAdapter';
import { ExecutionLanguageConfig, ParameterConfig, DataType } from '../ExecutionTypes';
import { TestCase } from '../ExecutionContract';

export class JavaAdapter implements LanguageAdapter {
  private getJavaType(type: DataType): string {
    switch (type) {
      case 'int': return 'int';
      case 'float': return 'double';
      case 'boolean': return 'boolean';
      case 'string': return 'String';
      case 'int[]': return 'int[]';
      case 'float[]': return 'double[]';
      case 'boolean[]': return 'boolean[]';
      case 'string[]': return 'String[]';
      case 'void': return 'void';
      default: return 'Object';
    }
  }

  private formatValue(val: any, type: DataType): string {
    if (type === 'int') {
      return `${val}`;
    }
    if (type === 'float') {
      return `${val}`;
    }
    if (type === 'boolean') {
      return `${val}`;
    }
    if (type === 'string') {
      return `"${val}"`;
    }
    if (type === 'int[]') {
      if (!Array.isArray(val)) return 'new int[]{}';
      return `new int[]{${val.join(', ')}}`;
    }
    if (type === 'float[]') {
      if (!Array.isArray(val)) return 'new double[]{}';
      return `new double[]{${val.join(', ')}}`;
    }
    if (type === 'boolean[]') {
      if (!Array.isArray(val)) return 'new boolean[]{}';
      return `new boolean[]{${val.join(', ')}}`;
    }
    if (type === 'string[]') {
      if (!Array.isArray(val)) return 'new String[]{}';
      return `new String[]{${val.map(v => `"${v}"`).join(', ')}}`;
    }
    return `${val}`;
  }

  private formatOutputPrinter(type: DataType, varName: string): string {
    if (type === 'int[]' || type === 'string[]' || type === 'float[]' || type === 'boolean[]') {
      return `java.util.Arrays.toString(${varName}).replaceAll("\\\\s", "")`;
    }
    return `String.valueOf(${varName}).replaceAll("\\\\s", "")`;
  }

  buildWrapper(sourceCode: string, testCases: TestCase[], config: ExecutionLanguageConfig): string {
    // Assuming the user submits a class named 'Solution' with the target method.
    const className = 'Solution';
    const methodName = config.functionName;
    const params = config.parameters || [];
    const returnType = config.returnType;
    
    let mainBody = `
        ${className} sol = new ${className}();
        java.util.List<String> results = new java.util.ArrayList<>();
    `;

    testCases.forEach((tc, idx) => {
      const args: string[] = [];
      
      params.forEach((p: ParameterConfig, paramIdx: number) => {
        const val = tc.input[p.name];
        const valStr = this.formatValue(val, p.type);
        const jType = this.getJavaType(p.type);
        // Using arg_0, arg_1 format as requested
        mainBody += `            ${jType} arg_${paramIdx}_idx${idx} = ${valStr};\n`;
        args.push(`arg_${paramIdx}_idx${idx}`);
      });

      const callArgs = args.join(', ');
      
      let expectedStr = typeof (tc.expectedOutput ?? tc.expected) === 'string' ? 
          (tc.expectedOutput ?? tc.expected) : JSON.stringify(tc.expectedOutput ?? tc.expected);
      expectedStr = expectedStr.replace(/\\s/g, '').replace(/"/g, '\\"');

      const isVoid = returnType === 'void';
      
      mainBody += `
            String expected_${idx} = "${expectedStr}";
        try {
            ${isVoid ? `sol.${methodName}(${callArgs});` : `${this.getJavaType(returnType)} res_${idx} = sol.${methodName}(${callArgs});`}
            
            ${isVoid ? 
                `String actual_${idx} = ${this.formatOutputPrinter(params[0].type, `arg_0_idx${idx}`)};` 
                : 
                `String actual_${idx} = ${this.formatOutputPrinter(returnType, `res_${idx}`)};`
            }
            
            boolean passed_${idx} = actual_${idx}.equalsIgnoreCase(expected_${idx});
            
            String json_${idx} = "{\\"passed\\":" + passed_${idx} + 
                           ",\\"input\\":\\"${JSON.stringify(tc.input).replace(/"/g, '\\\\\\"')}\\"" + 
                           ",\\"expected\\":\\"" + escapeJson(expected_${idx}) + "\\"" + 
                           ",\\"actual\\":\\"" + escapeJson(actual_${idx}) + "\\"}";
            results.add(json_${idx});
        } catch(Exception e) {
            String json_${idx} = "{\\"passed\\":false" + 
                           ",\\"input\\":\\"${JSON.stringify(tc.input).replace(/"/g, '\\\\\\"')}\\"" + 
                           ",\\"expected\\":\\"" + escapeJson(expected_${idx}) + "\\"" + 
                           ",\\"actual\\":\\"Runtime Error: " + escapeJson(e.getMessage()) + "\\"}";
            results.add(json_${idx});
        }
      `;
    });

    mainBody += `
        System.out.println("\\n###NM_RESULTS###[" + String.join(",", results) + "]");
    `;

    return `
import java.util.*;

${sourceCode}

public class Main {
    public static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\\"");
    }

    public static void main(String[] args) {
${mainBody}
    }
}
`;
  }
}
