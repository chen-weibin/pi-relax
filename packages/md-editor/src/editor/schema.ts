import { Schema } from 'prosemirror-model'
import { marks } from './marks/index.ts'
import { nodes } from './nodes/index.ts'

export const editorSchema = new Schema({ nodes, marks })
