import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'

export abstract class TCanvasBase {
	protected container: HTMLDivElement

	protected renderer!: THREE.WebGLRenderer
	protected scene!: THREE.Scene
	protected camera!: THREE.Camera
	protected clock!: THREE.Clock
	protected resizeCallback?: () => void

	private _orbitControls?: OrbitControls
	private enableOrbitControlsDamping = false
	private animeId?: number
	private stats?: Stats

	constructor(parentNode: ParentNode, containerClassName = 'three-container') {
		let container: HTMLDivElement | null
		try {
			container = parentNode.querySelector<HTMLDivElement>(`.${containerClassName}`)
			if (!container) throw new Error(`undefind container: ${containerClassName}`)
		} catch (e) {
			console.error(e)
			throw e
		}
		this.container = container!
		this.init()
		this.addEvents()
	}

	// ------------------------------------------------------
	// initialize
	private init() {
		const { width, height, aspect } = this.size
		// renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
		this.renderer.setPixelRatio(window.devicePixelRatio)
		this.renderer.setSize(width, height)
		this.renderer.shadowMap.enabled = true
		this.renderer.outputEncoding = THREE.sRGBEncoding
		// ↓ with unreal bloom effect
		// renderer.toneMapping = THREE.ACESFilmicToneMapping
		// append canvas element
		this.container.appendChild(this.renderer.domElement)
		// scene
		this.scene = new THREE.Scene()
		// camera
		this.camera = new THREE.PerspectiveCamera(50, aspect, 0.01, 1000)
		this.camera.position.set(0, 0, 5)

		this.clock = new THREE.Clock()
	}

	// ------------------------------------------------------
	// utils
	protected get size() {
		// const { offsetWidth: width, offsetHeight: height } = this.container
		const { innerWidth: width, innerHeight: height } = window
		const aspect = width / height
		return { width, height, aspect }
	}

	protected setOrbitControls(damping: number | false = 0.1) {
		if (!this._orbitControls) this._orbitControls = new OrbitControls(this.camera, this.renderer.domElement)

		if (typeof damping === 'number') {
			this._orbitControls.enableDamping = true
			this._orbitControls.dampingFactor = damping
		} else {
			this._orbitControls.enableDamping = false
			this._orbitControls.dampingFactor = 0
		}
		this.enableOrbitControlsDamping = this._orbitControls.enableDamping
		return this._orbitControls
	}

	protected setPerspectiveCamera(fov?: number, aspect?: number, near?: number, far?: number) {
		this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
	}

	protected setOrthographicCamera(
		left?: number,
		right?: number,
		top?: number,
		bottom?: number,
		near?: number,
		far?: number,
	) {
		this.camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far)
	}

	protected calcCoveredTextureScale(texture: THREE.Texture, aspect: number, target?: THREE.Vector2) {
		const result = target ?? new THREE.Vector2()
		const imageAspect = texture.image.width / texture.image.height

		if (aspect < imageAspect) result.set(aspect / imageAspect, 1)
		else result.set(1, imageAspect / aspect)

		return result
	}

	protected coveredBackgroundTexture(texture: THREE.Texture) {
		texture.matrixAutoUpdate = false
		const scale = this.calcCoveredTextureScale(texture, this.size.aspect)
		texture.matrix.setUvTransform(0, 0, scale.x, scale.y, 0, 0.5, 0.5)

		return texture
	}

	// ------------------------------------------------------
	// helper
	protected setAxesHelper(size?: number) {
		const axesHelper = new THREE.AxesHelper(size)
		this.scene.add(axesHelper)
		return axesHelper
	}

	protected setStats() {
		if (!this.stats) {
			this.stats = Stats()
			this.container.appendChild(this.stats.dom)
		}
	}

	protected visibleStats(mode: 'visible' | 'hidden') {
		if (this.stats) {
			this.stats.dom.style.visibility = mode
		}
	}

	// ------------------------------------------------------
	// event
	private addEvents() {
		window.addEventListener('resize', this.handleResize)
	}

	private handleResize = () => {
		const { width, height, aspect } = this.size

		this.resizeCallback && this.resizeCallback()

		if (this.camera instanceof THREE.PerspectiveCamera) {
			this.camera.aspect = aspect
			this.camera.updateProjectionMatrix()
		}

		this.renderer.setSize(width, height)
	}

	// ------------------------------------------------------
	// lifecycle
	protected animate = (callback?: () => void, isRender = true) => {
		this.animeId = requestAnimationFrame(this.animate.bind(this, callback, isRender))

		this.enableOrbitControlsDamping && this._orbitControls?.update()
		this.stats && this.stats.update()

		callback && callback()

		isRender && this.renderer.render(this.scene, this.camera)
	}

	dispose() {
		this.stats && this.container.removeChild(this.stats.dom)

		this.animeId && cancelAnimationFrame(this.animeId)
		window.removeEventListener('resize', this.handleResize)
	}
}
