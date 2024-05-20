const disabled = true;

export class Logger {
  constructor(private tag: string) {}

  info(...message: any[]) {
    if (disabled) return;
    console.log(`%c${this.tag}`, "color: red; background: white", message);
  }

  debug(...message: any[]) {
    if (disabled) return;
    console.log(message);
  }
}
