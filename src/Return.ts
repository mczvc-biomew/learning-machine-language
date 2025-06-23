export class Return extends Error {

  constructor(
    public readonly value: Object | null) { super(); }

}