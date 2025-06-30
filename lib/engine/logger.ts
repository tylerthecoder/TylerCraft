const GLOBAL_DISABLE = false;

export class Logger {
  constructor(private tag: string, private disabled = false) {}

  info(...message: any[]) {
    if (GLOBAL_DISABLE || this.disabled) return;
    console.log(`%c${this.tag}`, "color: red; background: white", ...message);
  }

  debug(...message: any[]) {
    if (GLOBAL_DISABLE || this.disabled) return;
    console.log(...message);
  }
}
