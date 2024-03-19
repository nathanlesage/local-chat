import type { Config } from "../ConfigProvider"

export function getDefaultConfig (): Config {
  return {
    appearance: 'system',
    defaultModel: null
  }
}
