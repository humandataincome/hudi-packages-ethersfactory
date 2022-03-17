import { LogLevel } from '../config';

export default class Logger {
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  public log(level: LogLevel, message: string): void {
    console.log(`[${this.name}] [${(new Date()).toISOString()}] [${level}] ${message}`);
  }
}