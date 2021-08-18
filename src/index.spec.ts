import expect from 'expect'
import { persistentKey, PiniaHistory } from './index'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { ref } from 'vue'
import 'mock-local-storage'

describe('Pinia History', () => {
  const useOptionsStore = defineStore('one', {
    state: () => ({ count: 1 }),
    history: true,
  })

  const useFullOptionsStore = defineStore({
    id: 'one',
    state: () => ({ count: 1 }),
    history: true,
  })

  const useSetupStore = defineStore(
    'one',
    () => {
      const count = ref(1)
      return { count }
    },
    { history: true }
  )

  beforeEach(() => {
    const pinia = createPinia()
    pinia._p.push(PiniaHistory)
    setActivePinia(pinia)
    localStorage.clear()
  })

  it('should add undo method', async () => {
    // Check if typings work for all types of stores.

    const fullOptionsStore = useFullOptionsStore()
    const optionsStore = useOptionsStore()
    const setupStore = useSetupStore()
    expect(fullOptionsStore.undo).toBeDefined()
    expect(optionsStore.undo).toBeDefined()
    expect(setupStore.undo).toBeDefined()
  })

  it('should add redo method', async () => {
    // Check if typings work for all types of stores.

    const fullOptionsStore = useFullOptionsStore()
    const optionsStore = useOptionsStore()
    const setupStore = useSetupStore()
    expect(fullOptionsStore.redo).toBeDefined()
    expect(optionsStore.redo).toBeDefined()
    expect(setupStore.redo).toBeDefined()
  })

  it('should add canUndo getter', async () => {
    // Check if typings work for all types of stores.

    const fullOptionsStore = useFullOptionsStore()
    const optionsStore = useOptionsStore()
    const setupStore = useSetupStore()
    expect(fullOptionsStore.canUndo).toBeDefined()
    expect(optionsStore.canUndo).toBeDefined()
    expect(setupStore.canUndo).toBeDefined()
  })

  it('should add canRedo getter', async () => {
    // Check if typings work for all types of stores.

    const fullOptionsStore = useFullOptionsStore()
    const optionsStore = useOptionsStore()
    const setupStore = useSetupStore()
    expect(fullOptionsStore.canRedo).toBeDefined()
    expect(optionsStore.canRedo).toBeDefined()
    expect(setupStore.canRedo).toBeDefined()
  })

  it('should undo', async () => {
    const setupStore = useSetupStore()
    setupStore.$patch({ count: 2 })
    setupStore.count = 5
    setupStore.$patch({ count: 3 })
    expect(setupStore.count).toEqual(3)
    setupStore.undo()
    expect(setupStore.count).toEqual(5)
    setupStore.undo()
    expect(setupStore.count).toEqual(2)
    setupStore.undo()
    expect(setupStore.count).toEqual(1)
    expect(setupStore.canUndo).toBeFalsy()
  })

  it('should redo', async () => {
    const setupStore = useSetupStore()
    setupStore.$patch({ count: 2 })
    setupStore.count = 5
    setupStore.$patch({ count: 3 })
    setupStore.undo()
    setupStore.undo()
    setupStore.undo()
    expect(setupStore.count).toEqual(1)
    setupStore.redo()
    expect(setupStore.count).toEqual(2)
    setupStore.redo()
    expect(setupStore.count).toEqual(5)
    setupStore.redo()
    expect(setupStore.count).toEqual(3)
    expect(setupStore.canRedo).toBeFalsy()
  })

  it('should invalidate redo', async () => {
    const setupStore = useSetupStore()
    setupStore.$patch({ count: 2 })
    setupStore.count = 5
    setupStore.undo()
    expect(setupStore.canRedo).toBeTruthy()
    setupStore.count = 4
    expect(setupStore.canRedo).toBeFalsy()
    expect(setupStore.canUndo).toBeTruthy()
    setupStore.undo()
    expect(setupStore.count).toEqual(2)
    expect(setupStore.canRedo).toBeTruthy()
    setupStore.redo()
    expect(setupStore.count).toEqual(4)
  })

  it('should only store up to `option.max` items', async () => {
    const max = 5

    const store = defineStore(
      'one',
      () => {
        const count = ref(1)
        return { count }
      },
      { history: { max } }
    )()

    for (let i = 0; i < max + 1; i++) {
      store.$patch({ count: i })
    }

    for (let i = 0; i < max; i++) {
      store.undo()
    }

    expect(store.count).toEqual(0)
    expect(store.canUndo).toBeFalsy()

    for (let i = 0; i < max; i++) {
      store.redo()
    }

    expect(store.count).toEqual(5)
    expect(store.canRedo).toBeFalsy()
  })

  it('should persist the history', async () => {
    const store = defineStore(
      'one',
      () => {
        const count = ref(1)
        return { count }
      },
      { history: { persistent: true } }
    )()

    const undoKey = persistentKey(store, 'undo')
    const redoKey = persistentKey(store, 'redo')

    store.$patch({ count: 2 })

    expect(localStorage.getItem(undoKey)).toEqual('{"count":[2,1]}')
    expect(localStorage.getItem(redoKey)).toEqual('')

    store.undo()

    expect(localStorage.getItem(undoKey)).toEqual('')
    expect(localStorage.getItem(redoKey)).toEqual('{"count":[1,2]}')

    store.redo()

    expect(localStorage.getItem(undoKey)).toEqual('{"count":[2,1]}')
    expect(localStorage.getItem(redoKey)).toEqual('')
  })

  it('should persist the history with custom strategy', async () => {
    const storage: any = {}

    const store = defineStore(
      'one',
      () => {
        const count = ref(1)
        return { count }
      },
      {
        history: {
          persistent: true,
          persistentStrategy: {
            get(store, type) {
              return storage[store.$id]?.[type]
            },
            set(store, type, value) {
              storage[store.$id] ??= {}
              storage[store.$id][type] = value
                .map((value) => JSON.stringify(value))
                .join(',')
            },
            remove(store, type) {
              delete storage[store.$id]?.[type]
            },
          },
        },
      }
    )()

    store.$patch({ count: 2 })

    expect(storage[store.$id].undo).toEqual('{"count":[2,1]}')
    expect(storage[store.$id].redo).toEqual('')

    store.undo()

    expect(storage[store.$id].undo).toEqual('')
    expect(storage[store.$id].redo).toEqual('{"count":[1,2]}')

    store.redo()

    expect(storage[store.$id].undo).toEqual('{"count":[2,1]}')
    expect(storage[store.$id].redo).toEqual('')
  })
})
