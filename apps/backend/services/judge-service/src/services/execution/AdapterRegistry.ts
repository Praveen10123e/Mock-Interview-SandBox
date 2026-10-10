import { LanguageAdapter } from './LanguageAdapter';
import { PythonAdapter } from './adapters/PythonAdapter';
import { JavaScriptAdapter } from './adapters/JavaScriptAdapter';
import { JavaAdapter } from './adapters/JavaAdapter';
import { CppAdapter } from './adapters/CppAdapter';
import { CAdapter } from './adapters/CAdapter';

export class AdapterRegistry {
  static getAdapter(languageId: number): LanguageAdapter {
    switch (languageId) {
      case 71: return new PythonAdapter();
      case 93: 
      case 63: return new JavaScriptAdapter();
      case 62: return new JavaAdapter();
      case 54: return new CppAdapter();
      case 50: return new CAdapter();
      default:
        throw new Error(`Unsupported languageId: ${languageId}`);
    }
  }
}
