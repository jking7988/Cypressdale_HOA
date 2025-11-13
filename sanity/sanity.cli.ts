import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'nqd1f8zq', // e.g. 'abcd1234'
    dataset: 'production',
  },
  deployment: {
    appId: 'da8wtn2g0ncd20u9p0c6pfo6'
  },
})
