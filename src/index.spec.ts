import expect from 'expect'
import { PiniaHistory } from './index'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { ref } from 'vue'

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
})
