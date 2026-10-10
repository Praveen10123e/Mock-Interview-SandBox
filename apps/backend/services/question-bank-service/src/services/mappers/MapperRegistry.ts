import { DatasetMapper } from './DatasetMapper';
import { HRDatasetMapper } from './HRDatasetMapper';
import { SQLDatasetMapper } from './SQLDatasetMapper';
import { PythonDatasetMapper } from './PythonDatasetMapper';
import { AptitudeDatasetMapper } from './AptitudeDatasetMapper';
import { TechnicalDatasetMapper } from './TechnicalDatasetMapper';
import { CuratedCodingMapper } from './CuratedCodingMapper';
import { CuratedAptitudeMapper } from './CuratedAptitudeMapper';
import { CuratedHRMapper } from './CuratedHRMapper';
import { NormalizedQuestion } from './NormalizedQuestion';

export class MapperRegistry {
  private static mappers: DatasetMapper[] = [
    // Curated mappers FIRST — they match on specific ID prefixes (COD-, APT-, HR-)
    // and will never accidentally match bulk dataset records.
    new CuratedCodingMapper(),
    new CuratedAptitudeMapper(),
    new CuratedHRMapper(),
    // Bulk dataset mappers
    new HRDatasetMapper(),
    new SQLDatasetMapper(),
    new PythonDatasetMapper(),
    new AptitudeDatasetMapper(),
    new TechnicalDatasetMapper()
  ];

  static map(record: any): NormalizedQuestion {
    for (const mapper of this.mappers) {
      if (mapper.canMap(record)) {
        return mapper.map(record);
      }
    }
    throw new Error('No compatible dataset mapper found for record');
  }
}
