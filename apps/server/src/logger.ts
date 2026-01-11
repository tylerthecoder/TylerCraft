export const makeLogger = (name: string) => {
  return (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] ${name}: `, ...args);
  };
};
