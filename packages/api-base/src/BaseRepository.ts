export abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(options?: any): Promise<T[]>;
  abstract create(data: CreateDTO): Promise<T>;
  abstract update(id: string, data: UpdateDTO): Promise<T>;
  abstract delete(id: string): Promise<boolean>;
}
