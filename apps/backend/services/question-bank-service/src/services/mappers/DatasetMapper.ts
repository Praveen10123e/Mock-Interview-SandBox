import { NormalizedQuestion } from './NormalizedQuestion';

export interface DatasetMapper {
  /**
   * Identifies if this mapper can handle the given raw JSON record.
   * Based on specific object signatures.
   */
  canMap(record: any): boolean;

  /**
   * Maps a raw dataset record into a NormalizedQuestion.
   * Throws an error if the record is structurally invalid.
   */
  map(record: any): NormalizedQuestion;
}
