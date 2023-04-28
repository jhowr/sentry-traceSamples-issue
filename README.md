Here is the minimal reproducible app for our problem at @maxsystems

### How to run

Once you have `node` and `npm` installed in the machine that will run it (I'm using the node v16 btw), you'll be able to follow the steps below

#### Install the dependencies

```
npm i
```

#### Replace the Sentry DSN

At [line 92 of `plugins/sentry.js`](plugins/sentry.js#L92) you'll need replace the value for a valid Sentry DSN url

#### Run the project

```
npm start
```

After this, the system should start listen the port `4000`, so you can perform the following query

```gql
query MyBooks {
  books {
    title
  }
}
```

After had performing this, you'll see that transaction was logged properly in Sentry, like this:

[image logged transaction]

So far so good, you'll see that the operation name look good as well, however we want customize the samples by operation name using the `tracesSampler` prop at [line 100](plugins/sentry.js#L100), but inside this function we are not able to get the proper operation name, and even using the `ignoreTransactions` like at [line 110](plugins/sentry.js#L110) to ignore same transaction we want, it doesn't works.
