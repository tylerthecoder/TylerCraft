export interface MessageDto<
  MESSAGE extends string,
  DATA extends Record<MESSAGE, unknown>
> {
  readonly type: MESSAGE;
  readonly data: DATA[MESSAGE];
}

export class MessageHolder<T extends string, DATA extends Record<T, unknown>> {
  constructor(public type: T, public data: DATA[T]) {}

  getDto() {
    return {
      type: this.type,
      data: this.data,
    };
  }

  isType<U extends T>(type: U): this is MessageHolder<U, DATA> {
    return type === this.type;
  }
}
