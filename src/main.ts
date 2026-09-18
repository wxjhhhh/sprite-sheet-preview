import './style.css'

const SLOT_COUNT = 6
const COLS = 4
const ROWS = 4
const FPS = 4
const FRAME_MS = 1000 / FPS

type Sheet = {
  url: string
  image: HTMLImageElement
  name: string
}

const sheets: (Sheet | null)[] = Array.from({ length: SLOT_COUNT }, () => null)
let activeSlot = -1
let playing = false
let frameIndex = 0
let lastTick = 0
let rafId = 0

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <header class="app-bar">
    <h1>精灵图预览</h1>
    <p>上传最多 6 张 4×4 精灵图 · 点播放后右侧按行循环 · ${FPS} fps</p>
  </header>
  <div class="layout">
    <aside class="sidebar" id="sidebar"></aside>
    <main class="main">
      <div class="stage" id="stage"></div>
    </main>
  </div>
`

const sidebar = document.querySelector<HTMLElement>('#sidebar')!
const stage = document.querySelector<HTMLElement>('#stage')!

const canvases: HTMLCanvasElement[] = []
const emptyLabels: HTMLElement[] = []

for (let row = 0; row < ROWS; row++) {
  const pane = document.createElement('div')
  pane.className = 'pane'
  const tag = document.createElement('span')
  tag.className = 'tag'
  tag.textContent = `行 ${row + 1}`
  const empty = document.createElement('span')
  empty.className = 'empty'
  empty.textContent = '等待播放'
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  canvas.hidden = true
  pane.append(tag, empty, canvas)
  stage.appendChild(pane)
  canvases.push(canvas)
  emptyLabels.push(empty)
}

const slotEls: HTMLElement[] = []
const playBtns: HTMLButtonElement[] = []

for (let i = 0; i < SLOT_COUNT; i++) {
  const slot = document.createElement('div')
  slot.className = 'slot'

  const label = document.createElement('div')
  label.className = 'slot-label'
  label.textContent = `视角 ${i + 1}`

  const drop = document.createElement('label')
  drop.className = 'drop'

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png,image/jpeg,image/webp,image/gif'

  const hint = document.createElement('span')
  hint.className = 'hint'
  hint.innerHTML = '上传 4×4<br/>精灵图'

  drop.append(input, hint)

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'play-btn'
  btn.disabled = true
  btn.textContent = '播放'

  slot.append(label, drop, btn)
  sidebar.appendChild(slot)
  slotEls.push(slot)
  playBtns.push(btn)

  const setDrag = (on: boolean) => drop.classList.toggle('dragover', on)
  ;['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault()
      setDrag(true)
    }),
  )
  ;['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault()
      setDrag(false)
    }),
  )
  drop.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0]
    if (file) void loadFile(i, file)
  })
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) void loadFile(i, file)
    input.value = ''
  })
  btn.addEventListener('click', () => togglePlay(i))
}

async function loadFile(index: number, file: File) {
  if (!file.type.startsWith('image/')) return
  const prev = sheets[index]
  if (prev) URL.revokeObjectURL(prev.url)

  const url = URL.createObjectURL(file)
  const image = await loadImage(url)
  sheets[index] = { url, image, name: file.name }

  const drop = slotEls[index].querySelector('.drop') as HTMLElement
  drop.querySelector('.hint')?.remove()
  let thumb = drop.querySelector('img.thumb') as HTMLImageElement | null
  if (!thumb) {
    thumb = document.createElement('img')
    thumb.className = 'thumb'
    thumb.alt = file.name
    drop.appendChild(thumb)
  }
  thumb.src = url
  playBtns[index].disabled = false

  if (activeSlot === index && playing) {
    frameIndex = 0
    drawAll()
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

function togglePlay(index: number) {
  if (!sheets[index]) return

  if (activeSlot === index && playing) {
    stopPlayback()
    return
  }

  activeSlot = index
  playing = true
  frameIndex = 0
  lastTick = performance.now()
  updateSlotUI()
  drawAll()
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(tick)
}

function stopPlayback() {
  playing = false
  cancelAnimationFrame(rafId)
  updateSlotUI()
}

function updateSlotUI() {
  slotEls.forEach((el, i) => {
    el.classList.toggle('active', i === activeSlot && playing)
    const btn = playBtns[i]
    if (i === activeSlot && playing) {
      btn.textContent = '暂停'
      btn.classList.add('playing')
    } else {
      btn.textContent = '播放'
      btn.classList.remove('playing')
    }
  })
}

function tick(now: number) {
  if (!playing) return
  if (now - lastTick >= FRAME_MS) {
    lastTick = now
    frameIndex = (frameIndex + 1) % COLS
    drawAll()
  }
  rafId = requestAnimationFrame(tick)
}

function drawAll() {
  const sheet = activeSlot >= 0 ? sheets[activeSlot] : null
  for (let row = 0; row < ROWS; row++) {
    const canvas = canvases[row]
    const empty = emptyLabels[row]
    if (!sheet) {
      canvas.hidden = true
      empty.hidden = false
      continue
    }
    empty.hidden = true
    canvas.hidden = false
    drawFrame(canvas, sheet.image, row, frameIndex)
  }
}

function drawFrame(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  row: number,
  col: number,
) {
  const fw = image.naturalWidth / COLS
  const fh = image.naturalHeight / ROWS
  const size = Math.max(64, Math.ceil(Math.max(fw, fh)))
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size
    canvas.height = size
  }
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, size, size)
  const scale = Math.min(size / fw, size / fh)
  const dw = fw * scale
  const dh = fh * scale
  const dx = (size - dw) / 2
  const dy = (size - dh) / 2
  ctx.drawImage(image, col * fw, row * fh, fw, fh, dx, dy, dw, dh)
}
