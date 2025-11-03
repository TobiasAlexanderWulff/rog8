import { ensureParse5ForCommonJS } from './parse5-shim';

export default async function globalSetup(): Promise<void> {
  await ensureParse5ForCommonJS();
}
