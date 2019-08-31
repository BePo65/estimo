const puppeteer = require('puppeteer-core')
const nanoid = require('nanoid')
const { megabitsToBytes, resolvePathToTempDir } = require('./utils')
const chromeConfig = require('../chrome.json')

const defaultBrowserOptions = {
  headless: true,
  timeout: 20000,
  executablePath: chromeConfig.executablePath,
}

async function createChromeTrace(resources, browserOptions) {
  const options = { ...defaultBrowserOptions, ...browserOptions }

  // Create browser entity
  const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  if (options.width && options.height) {
    launchArgs.push(`--window-size=${options.width},${options.height}`)
  }
  const browser = await puppeteer.launch({
    headless: options.headless,
    executablePath: options.executablePath,
    args: launchArgs,
    ignoreDefaultArgs: ['--disable-extensions'],
  })

  // Set-up page entity
  const page = await browser.newPage()
  if (options.userAgent) {
    await page.setUserAgent(options.userAgent)
  }
  if (options.width && options.height) {
    await page.setViewport({
      width: options.width, height: options.height,
    })
  }
  if (options.device) {
    await page.emulate(puppeteer.devices[options.device])
  }
  page.on('error', msg => {
    throw msg
  })
  const client = await page.target().createCDPSession()

  // Enable Network Emulation
  if (options.emulateNetworkConditions) {
    await client.send('Network.emulateNetworkConditions', {
      offline: options.offline,
      latency: options.latency,
      downloadThroughput: megabitsToBytes(options.downloadThroughput),
      uploadThroughput: megabitsToBytes(options.uploadThroughput),
      connectionType: options.connectionType,
    })
  }

  // Enable CPU Emulation
  if (options.emulateCpuThrottling) {
    await client.send('Emulation.setCPUThrottlingRate', { rate: options.cpuThrottlingRate })
  }

  // Generate trace files
  const resourcesWithTrace = []
  try {
    for (const item of resources) {
      const traceFile = resolvePathToTempDir(`${nanoid()}.json`)
      await page.tracing.start({ path: traceFile })
      await page.goto(item.url, { timeout: options.timeout })
      await page.tracing.stop()
      resourcesWithTrace.push({ ...item, trace: traceFile })
    }
  } catch (error) {
    console.error(error)
    return process.exit(1)
  } finally {
    await client.detach()
    await page.close()
    await browser.close()
  }

  return resourcesWithTrace
}

module.exports = { createChromeTrace }
