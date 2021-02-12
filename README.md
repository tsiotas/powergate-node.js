# Powergate Node.js
This is a fork of  Textile + Node Starter Project [TypeScript-Node-Starter project](https://github.com/microsoft/TypeScript-Node-Starter) 

It's a simple project to test Powergate works with Filecoin architecture (Lotus + IPFS) in localnet

Content in this project includes sections for:

- authenticate with different users at the same time
- get informations about a User profile (Id, token and balance)
- send Filecoin between different user addresses
- get informations about Jobs and Deals
- Pin a file a seal deals 
- get information about the file status or download it from the web page
 

### Install

```
npm install
```

### Configure

You need to get OAuth app credentials for [Twitter](https://developer.twitter.com/en/docs/accounts-and-users/subscribe-account-activity/guides/authenticating-users), [Google](https://developers.google.com/identity/protocols/oauth2), and [GitHub](https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/).

Be sure when setting up each of these apps in the services that you set the correct callback url. For deveopment, those will be:

* Twitter -- `http://localhost:3000/auth/twitter/callback`
* GitHub -- `http://localhost:3000/auth/github/callback`
* Google -- `http://localhost:3000/auth/google/callback`

Copy the template `.env` file found in `.env.example` to `.env`. **NEVER SHARE OR PUBLISH THIS FILE**.

```bash
cp .env.example .env
```

Replace each of the credentials for Twitter, Google, and GitHub that you setup above. If you prefer to remove any of these methods, you can remove them from the login options in `views/partials/header.pug`.

## Build

```
npm run build
```

## Setup Powergate 
First of all you need clone the Powergate Docker from here  https://github.com/textileio/powergate/releases in a different directory
(for this project we used powergate v.2.0.0) 

### Run Powergate

```
make localnet
```

you can have access to the docker instances of Powergate by: 

```
docker exec -it localnet_powergate_1 sh 
```

and use the powergate CLI apis:

```
./pow help
```

## Start

```
npm run start
```

The app will start on http://localhost:3000


# Authors
Luca Lorello and Giorgio Tsiotas

# References
https://docs.textile.io/powergate/

https://docs.filecoin.io 

https://github.com/filecoin-project/

https://github.com/textileio/powergate/releases

https://textileio.github.io/js-powergate-client

https://blog.textile.io/integrating-powergate/

https://www.npmjs.com/package/@textile/powergate-client

https://github.com/textileio/js-powergate-client/tree/master/examples/node


# License
Licensed under the [MIT](LICENSE.txt) License.
