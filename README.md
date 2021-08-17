<h1>
  <img height="64" src="https://pinia.esm.dev/logo.svg" alt="Pinia logo">
  Pinia Debounce
</h1>

<a href="https://npmjs.com/package/pinia-plugin-history">
  <img src="https://badgen.net/npm/v/pinia-plugin-history" alt="npm package">
</a>
<a href="https://github.com/yassilah/pinia-plugin-history/actions/workflows/test.yml">
  <img src="https://github.com/yassilah/pinia-plugin-history/workflows/test/badge.svg" alt="build status">
</a>
<a href="https://codecov.io/gh/yassilah/pinia-plugin-history">
  <img src="https://codecov.io/gh/yassilah/pinia-plugin-history/branch/main/graph/badge.svg"/>
</a>

Add undo and redo methods to any your pinia 🍍 stores!

## Installation

```sh
npm install pinia-plugin-history
```
or

```sh
yarn add pinia-plugin-history
```

## Usage

```ts
import { PiniaHistory } from 'pinia-plugin-history'

// Pass the plugin to your application's pinia plugin
pinia.use(PiniaHistory)
```

You can then use a `history` option in your stores:

```ts
defineStore('id', () => {
    const count = ref(2)

    return { count }
}, { history: true })
```
or 

```ts
defineStore('id', {
    state: () => ({ count:  2}),
    history: true
})
```

This will automatically add two actions `undo` and `redo` as well as two getters `canUndo` and `canRedo` to you store. It will also automatically add the proper typings if you're using TypeScript 🎉

### Example

```vue
<template>
    <div>
        <button :disabled="!store.canUndo" @click="undo">Undo</button>
        <button :disabled="!store.canRedo" @click="redo">Redo</button>
        <input type="number" v-model="store.count" />
    </div>
</template> 

<script lang="ts" setup>
import { useStore } from '@/store'

const store = useStore()
</script>
```

## Configuration

You may also pass some extra configuration to the `history` option.


```ts
defineStore('id', {
    state: () => ({ count:  2}),
    history: {
        max: 25, // Maximum number of items to keep in history (default: 10)

        persistent: true, // Whether to store the current history locally in your browser (default: false)

        persistentStrategy: { // How to store locally in your broswer (default: use `localStorage` if available)
            get(store: HistoryStore, type: 'undo' | 'redo'): string[] | undefined,
            set(store: HistoryStore, type: 'undo' | 'redo', value: string[]): void,
            remove(store: HistoryStore, type: 'undo' | 'redo'): void
        } 
    }
})
```
## License

[MIT](http://opensource.org/licenses/MIT)