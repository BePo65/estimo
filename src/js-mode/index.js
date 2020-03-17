const { prepareLibrariesForEstimation } = require('./prepare-libs-for-estimo')
const { createChromeTrace } = require('../create-chrome-trace')
const { generatePrettyReport } = require('../reporter')
const { removeAllFiles, debugLog } = require('../utils')

async function estimoJsMode(libraries, browserOptions) {
  let resources = await prepareLibrariesForEstimation(libraries)
  resources = await createChromeTrace(resources, browserOptions)
  debugLog(
    `\n[js-mode]: Next javascript resources has been prepared: ${JSON.stringify(resources)}\n`
  )

  const reports = await generatePrettyReport(resources)
  debugLog(`\n[js-mode]: Got reports for js files: ${JSON.stringify(reports)}\n`)

  if (!process.env.ESTIMO_DEBUG) {
    await removeAllFiles(resources.map(item => item.html))
    await removeAllFiles(resources.map(item => item.trace))
  }

  return reports
}

module.exports = { estimoJsMode }
