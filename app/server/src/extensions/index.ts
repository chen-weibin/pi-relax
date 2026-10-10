import { createCodemodeExtension } from '@earendil-works/pi-coding-agent'
import { providerRequestTrace } from './providerRequestTrace.js'

/** 自己写的 pi 扩展，加上基座不会自动加载的 codemode。官方插件走 additionalExtensionPaths。 */
export const extensionFactories = [providerRequestTrace, createCodemodeExtension()]
