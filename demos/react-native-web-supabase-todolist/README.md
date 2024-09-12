# PowerSync + Supabase Todo List App: React Native for Web Demo

## Overview

This demo app is an extension of the [Supabase Todo List App](../react-native-supabase-todolist/) and demonstrates the use of the [PowerSync SDK for React Native](https://www.npmjs.com/package/@powersync/react-native) together with Supabase in a [React Native Web](https://necolas.github.io/react-native-web/) project.

To use PowerSync in a React Native for Web project, additional config is required. This is detailed in the [Configuring PowerSync for React Native for Web](#configuring-powersync-for-react-native-for-web) section further below.

To run this demo, follow these instructions:

## Running this demo

### Install dependencies

In the repo directory, use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
pnpm build:packages
```

### Set up Supabase Project

Detailed instructions for integrating PowerSync with Supabase can be found in the [integration guide](https://docs.powersync.com/integration-guides/supabase). Below are the main steps required to get this demo running.

Create a new Supabase project, and paste and run the contents of [database.sql](./database.sql) in the Supabase SQL editor.

It does the following:

1. Create `lists` and `todos` tables.
2. Create a publication called `powersync` for `lists` and `todos`.
3. Enable row level security and storage policies, allowing users to only view and edit their own data.
4. Create a trigger to populate some sample data when a user registers.

### Set up PowerSync Instance

Create a new PowerSync instance, connecting to the database of the Supabase project. See instructions [here](https://docs.powersync.com/integration-guides/supabase-+-powersync#connect-powersync-to-your-supabase).

Then deploy the following sync rules:

```yaml
bucket_definitions:
  user_lists:
    # Separate bucket per todo list
    parameters: select id as list_id from lists where owner_id = request.user_id()
    data:
      - select * from lists where id = bucket.list_id
      - select * from todos where list_id = bucket.list_id
```

### Configure the app

#### 1. Set up environment variables: 

Copy the `.env.local.template` file:

```bash
cp .env.local.template .env.local
```

Then edit `.env.local` to insert your Supabase and PowerSync project credentials.

#### 2. Configure web workers

This is required for the React Native Web implementation. Learn more in [Configuring PowerSync for React Native for Web](#configuring-powersync-for-react-native-for-web).

```bash
mkdir -p public/@powersync && cp -r node_modules/@powersync/web/dist/* public/@powersync/
```

### EAS Build configuration

Take note that you will need an [Expo](https://expo.dev/) account if you want to use EAS for your builds. The Expo project ID should then also be configured in the environment file.

For secret/sensitive environment variables which shouldn't be checked into source control, you can configure them as EAS secrets. They can be added via either the Expo website or the EAS CLI, both are explained [here](https://docs.expo.dev/build-reference/variables/#using-secrets-in-environment-variables).

General information on defining environment variables with Expo can be found here [here](https://docs.expo.dev/build-reference/variables/#can-eas-build-use-env-files).

### Run the app

Run on Web:

```sh
pnpm web
```

Web bundling can take a few seconds.

Run on iOS:

```sh
pnpm ios
```

Run on Android:

```sh
pnpm android
```

## Configuring PowerSync for React Native for Web

To ensure that `PowerSync` features are fully supported in your `React Native Web` project, follow these steps. This documentation covers necessary configurations, setup, and multi-platform implementation.

### 1. Configuring the workers

With `React Native Web` the workers need to be configured when instantiating `PowerSyncDatabase`, refer to the example [here](./library/powersync/system.ts). The contents of `node_modules/@powersync/web/dist` should be copied to the root of your project (typically in the `public ` directory). You can then specify the resolution for each worker (available in the `worker` directory of the `dist` contents).

To make it easier to manage these files in the `public` directory, it is recommended to place the contents in a nested directory like `@powersync`.

You can run the following bash command to automate the copying process. It will copy the contents to `/public/@powersync`.

```
mkdir -p public/@powersync && cp -r node_modules/@powersync/web/dist/* public/@powersync/
```

The example below demonstrates how to configure the DB and sync workers:

```javascript
const factory = new WASQLiteOpenFactory({
  dbFilename: 'sqlite.db',

  // You can specify a path to the db worker
  worker: '/@powersync/worker/WASQLiteDB.umd.js'

  // Or provide a factory function to create the worker.
  // The worker name should be unique for the database filename to avoid conflicts if multiple clients with different databases are present.
  // worker: (options) => {
  //   if (options?.flags?.enableMultiTabs) {
  //     return new SharedWorker(`/@powersync/worker/WASQLiteDB.umd.js`, {
  //       name: `shared-DB-worker-${options?.dbFilename}`
  //     });
  //   } else {
  //     return new Worker(`/@powersync/worker/WASQLiteDB.umd.js`, {
  //       name: `DB-worker-${options?.dbFilename}`
  //     });
  //   }
  // }
});

this.powersync = new PowerSyncDatabaseWeb({
  schema: AppSchema,
  database: factory,
  sync: {
    // You can specify a path to the sync worker
    worker: '/@powersync/worker/SharedSyncImplementation.umd.js'

    // Or provide a factory function to create the worker.
    // The worker name should be unique for the database filename to avoid conflicts if multiple clients with different databases are present.
    // worker: (options) => {
    //   return new SharedWorker(`/@powersync/worker/SharedSyncImplementation.umd.js`, {
    //     name: `shared-sync-${options?.dbFilename}`
    //   });
    // }
  }
});
```

### 2. Multi-platform support

A common use case for `React Native Web` is to have a single `react-native` project that targets both mobile and web platforms. To support this setup, you need to adjust the Metro configuration and handle platform-specific libraries accordingly.

#### Metro config

Refer to the example [here](./metro.config.js).
Setting `config.resolver.resolveRequest` allows Metro to behave differently based on the platform.

```javascript
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // Depending on `@powersync/web` for functionality, ignore mobile specific dependencies.
    if (['react-native-prompt-android', '@powersync/react-native'].includes(moduleName)) {
      return {
        type: 'empty'
      };
    }
    const mapping = { 'react-native': 'react-native-web', '@powersync/web': '@powersync/web/dist/index.umd.js' };
    if (mapping[moduleName]) {
      console.log('remapping', moduleName);
      return context.resolveRequest(context, mapping[moduleName], platform);
    }
  } else {
    // Depending on `@powersync/react-native` for functionality, ignore `@powersync/web` dependencies.
    if (['@powersync/web'].includes(moduleName)) {
      return {
        type: 'empty'
      };
    }
  }

  // Ensure you call the default resolver.
  return context.resolveRequest(context, moduleName, platform);
};
```

#### Implementations

Many `React-native` and `web` packages are implemented with only their specific platform in mind, as such there may be times where you will need to evaluate the platform and provide alternative implementations.

##### Instantiating PowerSync

The following snippet constructs the correct PowerSync database depending on the platform that the code is executing on.

```javascript
import React from 'react';
import { PowerSyncDatabase as PowerSyncDatabaseNative } from '@powersync/react-native';
import { PowerSyncDatabase as PowerSyncDatabaseWeb } from '@powersync/web';

if (PowerSyncDatabaseNative) {
  this.powersync = new PowerSyncDatabaseNative({
    schema: AppSchema,
    database: {
      dbFilename: 'sqlite.db'
    }
  });
} else {
  const factory = new WASQLiteOpenFactory({
    dbFilename: 'sqlite.db',
    worker: '/@powersync/worker/WASQLiteDB.umd.js'
  });
  this.powersync = new PowerSyncDatabaseWeb({
    schema: AppSchema,
    database: factory,
    sync: {
      worker: '/@powersync/worker/SharedSyncImplementation.umd.js'
    }
  });
}
```

##### Implementations that don't support both mobile and web

```javascript
import { Platform } from 'react-native';

import { Platform } from 'react-native';
import rnPrompt from 'react-native-prompt-android';

// Example conditional implementation
export async function prompt(
    title = '',
  description = '',
  onInput = (_input: string | null): void | Promise<void> => {},
  options: { placeholder: string | undefined } = { placeholder: undefined }
) {
  const isWeb = Platform.OS === 'web';
  let name: string | null = null;

  if (isWeb) {
    name = window.prompt(`${title}\n${description}`, options.placeholder);
  } else {
    name = await new Promise((resolve) => {
      rnPrompt(
        title,
        description,
        (input) => {
          resolve(input);
        },
        { placeholder: options.placeholder, style: 'shimo' }
      );
    });
  }

  await onInput(name);
}

```

Which can then be used agnostically in a component.

```jsx
import { Button } from 'react-native';
import { prompt } from 'util/prompt';

<Button
  title="Add"
  onPress={() => {
    prompt(
      'Add a new Todo',
      '',
      (text) => {
        if (!text) {
          return;
        }

        return createNewTodo(text);
      },
      { placeholder: 'Todo description' }
    );
  }}
/>;
```

### 3. TypeScript Configuration to allow UMD imports

A `UMD` version of `@powersync/web` is available at `@powersync/web/umd`.
To support the version, two changes are required to the project.

1. Add `config.resolver.unstable_enablePackageExports = true;` to your `metro.config.js` file.
2. In the `tsconfig.json` file specify the `moduleResolution` to be `Bundler`.

```json
 "compilerOptions": {
    "moduleResolution": "Bundler"
  }
```