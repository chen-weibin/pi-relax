import { code, type CodeMarkJson } from './code.ts'
import { em, type EmMarkJson } from './em.ts'
import { link, type LinkMarkJson } from './link.ts'
import { strike, type StrikeMarkJson } from './strike.ts'
import { strong, type StrongMarkJson } from './strong.ts'

export const marks = {
	link,
	em,
	strong,
	strike,
	code,
}

export type MarkJson = LinkMarkJson | EmMarkJson | StrongMarkJson | StrikeMarkJson | CodeMarkJson
