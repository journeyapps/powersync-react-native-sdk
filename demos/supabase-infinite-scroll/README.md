# PowerSync + Supabase Web Demo: Infinite Scrolling

## Overview

Demo app illustrating various infinite scrolling strategies using lazy-load scenarios described in [Use Case Examples: Infinite Scrolling](https://docs.powersync.com/usage/use-case-examples/infinite-scrolling)

## Prerequisites

1. You will need to sign up for a PowerSync account and create an instance connected to Supabase. A step-by-step guide on Supabase<>PowerSync integration is available [here](https://docs.powersync.com/integration-guides/supabase).
1. Apply the contents of `Supabase.sql` in this repo to your Supabase project.
1. Enable Anonymous Sign-ins in Supabase (**Project Settings -> Authentication -> User Signups**)

## Getting Started

First install the project dependencies. Run the following command in the repo root:

```bash
pnpm install
pnpm build:packages
```

Then switch into this demo's directory:

```bash
cd demos/supabase-infinite-scroll
```

Set up the Environment variables: Copy the `.env.local.template` file:

```bash
cp .env.local.template .env.local
```

And then edit `.env.local` to insert your credentials for Supabase and PowerSync.

Run the development server:

```bash
pnpm dev
```

This will start the Vite development server. Open your browser and navigate to the URL provided in the terminal (usually [http://localhost:5173](http://localhost:5173)) to view the demo. Use the control buttons to toggle between scenarios and get a feel for the behavior.

## Specific Scenarios
This section provides an index to the various scenarios described in the [docs](https://docs.powersync.com/usage/use-case-examples/infinite-scrolling).

### Pre-sync all data and query the local database

* Implemented in [`src/dataSources/preSync.js`](src/dataSources/preSync.js)

### Control data sync using client parameters

* Implemented in [`src/dataSources/pagedSync.js`](src/dataSources/pagedSync.js)
* Uses the `paged_list` table in Postgres

### Client-side triggers a server-side function to flag data to sync

* Implemented in [`src/dataSources/triggerSync.js`](src/dataSources/triggerSync.js)
* Uses the `syncto_list` table in Postgres

### Sync limited data and then load more data from an API

* Not implemented. A trivial modification of `preSync.js` would suffice.
* Would also use the `syncto_list` table in Postgres

## Framework For Running Scenarios

### Page Framework Files
`styles.css`
`index.html`
`index.js`

### Virtual Listbox
`src/listBox/index.js`
`src/listBox/itemBuffer.js`

### Known Issues

* Sometimes when switching scenarios using the control buttons there is a remnant loading spinner. Simply scroll to dismiss it.