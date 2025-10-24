/** DTO genérico para teste */
export class PageableDTO<T> {
  page!: number;
  limit!: number;
  total!: number;
  results!: T[];
}
