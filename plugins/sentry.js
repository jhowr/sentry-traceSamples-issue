const Sentry = require('@sentry/node')
const { ExtraErrorData } = require('@sentry/integrations')

class SentryClient {
  constructor (config) {
    this.config = config
    Sentry.init(this.config.client)

    this.capture = this.capture.bind(this)
    this.middleware = this.middleware.bind(this)
    this.withErrorHandling = this.withErrorHandling.bind(this)
  }

  /**
   * Capture an error in Sentry or log to the console if running locally.
   * @param {Error} err
   */
  capture (err) {
    if (!this.config.shouldReportErrors) {
      console.error(err)
      return
    }

    if (
      this.config.suppressedErrors?.some(type =>
        [err, err.originalError].some(e => e instanceof type))
    ) return

    Sentry.captureException(err)
  }

  /**
   * Parse the request object to pull out metadata which is reported in Sentry.
   * For proper consumer-facing error handling you'll need this and the
   * `middleware` function. Alternatively you can just use `withErrorHandling`
   */
  handler (next) {
    const defaultHandler = (req, res) => Sentry.Handlers.requestHandler()(req, res, () => next(req, res))
    const tracingHandler = (req, res) => Sentry.Handlers.requestHandler()(req, res, () => Sentry.Handlers.tracingHandler()(req, res, () => next(req, res)))

    return this.config.client?.tracesSampleRate
      ? tracingHandler
      : defaultHandler
  }

  /**
   * Each middleware or request handler can be wrapped with this higher order
   * function to gracefully fail when errors are thrown. Exceptions are logged in
   * Sentry with additional context about the request and stacktrace.
   */
  middleware (fn) {
    return async (req, res) => {
      try {
        await fn(req, res)
      } catch (err) {
        this.capture(err)
        if (res.headersSent) return
        res.error({ error: err.message })
      }
    }
  }

  /**
   * Combines the above two methods in a single middleware-style method.
   * You should probably use this unless you know what you're doing.
   */
  withErrorHandling (fn) {
    return this.handler(this.middleware(fn))
  }
}

const requestDidStart = ({ request }) => {
  if (request.http?.method === 'OPTIONS') return

  const scope = Sentry.getCurrentHub()?.getScope()
  const transaction = scope?.getTransaction()
  if (!transaction) return

  return {
    didResolveOperation({ operationName }) {
      // Here the operation name looks correct
      console.log(operationName)
      if (!operationName) return
      transaction.setName(operationName)
    }
  }
}

module.exports = {
  client: new SentryClient({
    client: {
      dsn: 'vercel-dns-here',
      environment: 'development',
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new ExtraErrorData({ depth: 10 }),
      ],
      maxValueLength: 350,
      tracesSampleRate: true,
      tracesSampler ({ transactionContext, request }) {
        // Here the operation name is wrong (too generic)
        console.log(transactionContext.name, transactionContext.op)
        if (request.method === 'OPTIONS') return false
  
        // @TODO: Only sample 100% of slow transactions
        return 1
      }
    },
    shouldReportErrors: true,
    ignoreTransactions: ['MyBooks']
  }),
  requestDidStart
}
