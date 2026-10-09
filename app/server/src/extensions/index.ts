import { providerRequestTrace } from './providerRequestTrace.js'

/** 自己写的 pi 扩展。官方插件走 additionalExtensionPaths，不进这个列表。 */
export const extensionFactories = [providerRequestTrace]
