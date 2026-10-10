export type DataType = 
  | 'int' 
  | 'float' 
  | 'boolean' 
  | 'string' 
  | 'int[]' 
  | 'float[]' 
  | 'boolean[]' 
  | 'string[]' 
  | 'void';

export interface ParameterConfig {
  name: string;
  type: DataType;
}

export interface ExecutionLanguageConfig {
  functionName: string;
  parameters: ParameterConfig[];
  returnType: DataType;
  starterCode: string;
  judge0LanguageId: number;
}

export interface ExecutionMetadata {
  languages: Record<string, ExecutionLanguageConfig>;
}
