import {
  PiniaPluginContext,
  StateTree,
  Store,
  SubscriptionCallbackMutation,
} from 'pinia'
import { computed, ComputedRef, reactive, watch } from 'vue'

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    history?: boolean | Partial<HistoryPluginOptions>
  }

  export function defineStore<
    Id extends string,
    S extends StateTree = {},
    G extends GettersTree<S> = {},
    A = {},
    H = false
  >(
    id: Id,
    options: Omit<DefineStoreOptions<Id, S, G, A>, 'id'> & { history: H }
  ): H extends false
    ? StoreDefinition<Id, S, G, A>
    : StoreDefinition<Id, S, G & HistoryPluginGetters, A & HistoryPluginActions>

  export function defineStore<
    Id extends string,
    S extends StateTree = {},
    G extends GettersTree<S> = {},
    A = {},
    H = false
  >(
    options: DefineStoreOptions<Id, S, G, A> & { history: H }
  ): H extends false
    ? StoreDefinition<Id, S, G, A>
    : StoreDefinition<Id, S, G & HistoryPluginGetters, A & HistoryPluginActions>

  export function defineStore<Id extends string, SS, H = false>(
    id: Id,
    storeSetup: () => SS,
    options?: DefineSetupStoreOptions<
      Id,
      StoreState<SS>,
      StoreGetters<SS>,
      StoreActions<SS>
    > & { history: H }
  ): H extends false
    ? StoreDefinition<Id, StoreState<SS>, StoreGetters<SS>, StoreActions<SS>>
    : StoreDefinition<
        Id,
        StoreState<SS>,
        StoreGetters<SS> & HistoryPluginGetters,
        StoreActions<SS> & HistoryPluginActions
      >
}

export interface HistoryPluginOptions {
  max: number
  persistent: boolean
  persistentStrategy: {
    get(store: HistoryStore, type: 'undo' | 'redo'): string[] | undefined
    set(store: HistoryStore, type: 'undo' | 'redo', value: StateTree): void
    remove(store: HistoryStore, type: 'undo' | 'redo'): void
  }
}

export interface HistoryPluginActions {
  undo(): void
  redo(): void
}

export interface HistoryPluginGetters {
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
}

export interface History extends HistoryPluginOptions {
  done: string[]
  undone: string[]
  current: string
  trigger: boolean
}

export interface HistoryStore
  extends Store,
    HistoryPluginGetters,
    HistoryPluginActions {}

/**
 * Base options for the history.
 */
export const BasePiniaHistoryOptions = {
  max: 10,
  type: 'mutations',
  persistent: false,
  persistentStrategy: {
    get(store: HistoryStore, type: 'undo' | 'redo'): string[] | undefined {
      if (typeof localStorage !== undefined) {
        const key = persistentKey(store, type)
        const value = localStorage.getItem(key)
        if (!value) return

        return value.split(',')
      }
    },
    set(store: HistoryStore, type: 'undo' | 'redo', value: string[]) {
      if (typeof localStorage !== undefined) {
        const key = persistentKey(store, type)
        localStorage.setItem(key, value.join(','))
      }
    },
    remove(store: HistoryStore, type: 'undo' | 'redo') {
      if (typeof localStorage !== undefined) {
        const key = persistentKey(store, type)
        localStorage.removeItem(key)
      }
    },
  },
}

/**
 * Merge the user options with the default ones.
 *
 * @param options
 * @returns {HistoryPluginOptions}
 */
function mergeOptions(options: boolean | Partial<HistoryPluginOptions>) {
  return {
    ...BasePiniaHistoryOptions,
    ...(typeof options === 'boolean' ? {} : options),
  } as HistoryPluginOptions
}

/**
 * Save the history based on the given persistent strategy.
 *
 * @param store
 * @param $history
 */
function persistHistory(store: HistoryStore, $history: History) {
  const { persistent, persistentStrategy, done, undone } = $history

  if (persistent) {
    persistentStrategy.set(store, 'undo', done)
    persistentStrategy.set(store, 'redo', undone)
  }
}

/**
 * Watch for the persistent option value.
 *
 * @param $store
 * @param $history
 * @returns
 */
function createPersistentHistoryWatcher(
  $store: HistoryStore,
  $history: History
) {
  watch(
    () => $history.persistent,
    (persistent: boolean) => {
      const { persistentStrategy } = $history
      if (persistent) {
        if ($history.done.length === 0) {
          $history.done = persistentStrategy.get($store, 'undo') ?? []
        } else {
          persistentStrategy.set($store, 'undo', $history.done)
        }

        if ($history.undone.length === 0) {
          $history.undone = persistentStrategy.get($store, 'redo') ?? []
        } else {
          persistentStrategy.set($store, 'redo', $history.undone)
        }
      } else {
        persistentStrategy.remove($store, 'undo')
        persistentStrategy.remove($store, 'redo')
      }
    },
    { immediate: true }
  )
}

/**
 * Create an undo/redo method for the given store.
 *
 * @param store
 * @param $history
 * @param method
 * @returns
 */
function createStackMethod(
  store: HistoryStore,
  $history: History,
  method: 'undo' | 'redo'
) {
  const can = method === 'undo' ? 'canUndo' : 'canRedo'
  return () => {
    if (store[can]) {
      const { undone, done, max, current } = $history
      const stack = method === 'undo' ? done : undone
      const reverseStack = method === 'undo' ? undone : done

      const state = stack.pop()

      if (state === undefined) return

      if (reverseStack.length >= max) {
        reverseStack.splice(0, 1)
      }

      reverseStack.push(current)

      $history.trigger = false
      store.$patch(JSON.parse(state))
      $history.trigger = true

      persistHistory(store, $history)
    }
  }
}

/**
 * Create the store watcher to save
 * every mutation change.
 *
 * @param $history
 * @returns
 */
function createWatcher($history: History) {
  return (
    _mutation: SubscriptionCallbackMutation<any>,
    state: HistoryStore['$state']
  ) => {
    const { trigger, max, done, current } = $history

    if (trigger) {
      if (done.length >= max) {
        done.splice(0, 1)
      }

      done.push(current)
      $history.undone = []
    }

    $history.current = JSON.stringify(state)
  }
}

/**
 * Create a key for storing history state.
 *
 * @param store
 * @param method
 * @returns
 */
export function persistentKey(store: HistoryStore, method: 'undo' | 'redo') {
  return `pinia-plugin-history-${store.$id}-${method}` as const
}

/**
 * Adds a `history` option to your store to add `undo` and `redo` methods
 * and manage your state history.
 *
 * @example
 *
 * ```ts
 * import { PiniaHistory } from '@yassipad/pinia-plugin-history'
 *
 * // Pass the plugin to your application's pinia plugin
 * pinia.use(PiniaHistory)
 * ```
 */
export const PiniaHistory = ({ options, store }: PiniaPluginContext) => {
  const { history } = options

  if (history) {
    const { max, persistent, persistentStrategy } = mergeOptions(history)

    const $store = store as HistoryStore

    const $history = reactive({
      max,
      persistent,
      persistentStrategy,
      done: [] as string[],
      undone: [] as string[],
      current: JSON.stringify(store.$state),
      trigger: true,
      resetUndone: false,
    })

    store.canUndo = computed(() => $history.done.length > 0)

    store.canRedo = computed(() => $history.undone.length > 0)

    store.undo = createStackMethod($store, $history, 'undo')

    store.redo = createStackMethod($store, $history, 'redo')

    store.$subscribe(createWatcher($history))

    createPersistentHistoryWatcher($store, $history)
  }
}
