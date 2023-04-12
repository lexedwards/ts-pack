import { red, yellow } from './colours';
import { boolEmoji } from './symbols';

export function logResult(value: boolean | undefined, message: string) {
  console.info(` ${boolEmoji(value)} - ${message.trim()}`);
}

export function logWarning(message: string) {
  console.warn(`\n${yellow(message)}\n`);
}

export function logError(message: string) {
  console.error(`\n${red(message)}\n`);
}
