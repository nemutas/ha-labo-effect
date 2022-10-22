import * as THREE from 'three'
import { TCanvasBase } from './TCanvasBase'
import sphereVert from './shader/sphereVert.glsl'
import sphereFrag from './shader/sphereFrag.glsl'
import screenVert from './shader/screenVert.glsl'
import screenFrag from './shader/screenFrag.glsl'
import { Assets, loadAssets } from './assetLoader'
import { resolvePath } from '../utils'
import { gui } from './gui'
import gsap from 'gsap'
import { mouse2d } from './Mouse2d'

export class TCanvas extends TCanvasBase {
	private renderTarget!: THREE.WebGLRenderTarget
	private images: THREE.Texture[] = []
	private currentImageIndex = 0
	private isFirst = true
	private raycaster = new THREE.Raycaster()
	private pointer = new THREE.Vector2()
	private hoveredLink = false

	private assets: Assets = {
		github: { path: resolvePath('resources/github.png'), encoding: true },
		image1: { path: resolvePath('resources/image1.jpg') },
		image2: { path: resolvePath('resources/image2.jpg') },
		image3: { path: resolvePath('resources/image3.jpg') },
		image4: { path: resolvePath('resources/image4.jpg') },
	}

	constructor(parentNode: ParentNode, private observer: { readyCanvas: boolean }) {
		super(parentNode)

		loadAssets(this.assets).then(() => {
			this.setScene()
			this.setResize()
			this.createModel()
			this.createGsapAnimation()
			this.addEnvets()
			this.animate(this.update)
		})
	}

	private setScene() {
		this.camera.position.z = 3
		this.renderTarget = new THREE.WebGLRenderTarget(this.size.width, this.size.height)

		this.images.push(
			this.assets.image1.data as THREE.Texture,
			this.assets.image2.data as THREE.Texture,
			this.assets.image3.data as THREE.Texture,
			this.assets.image4.data as THREE.Texture,
		)
	}

	private setResize() {
		this.resizeCallback = () => {
			const sphere = this.getMesh<THREE.ShaderMaterial>('sphere')
			sphere.material.uniforms.u_screenCoord.value.copy(this.calcScreenCoord())

			const screen = this.getMesh<THREE.ShaderMaterial>('screen')
			const { width, height } = this.calcScreenSize()
			screen.scale.set(width, height, 1)

			const current = screen.material.uniforms.u_current.value
			this.calcCoveredTextureScale(current.data, this.size.aspect, current.uvScale)

			const next = screen.material.uniforms.u_next.value
			this.calcCoveredTextureScale(next.data, this.size.aspect, next.uvScale)

			const link = this.getMesh('link')
			const pos = this.calcLinkPosition()
			link.position.set(pos.x, pos.y, pos.z)
		}
	}

	private calcScreenCoord() {
		const { width, height } = this.size
		return new THREE.Vector2(width, height).multiplyScalar(window.devicePixelRatio)
	}

	private calcScreenSize() {
		const camera = this.camera as THREE.PerspectiveCamera
		const fovRadian = (camera.fov / 2) * (Math.PI / 180)
		const screenHeight = camera.position.z * Math.tan(fovRadian) * 2
		const screenWidth = screenHeight * this.size.aspect
		return { width: screenWidth, height: screenHeight }
	}

	private calcLinkPosition() {
		const { width, height } = this.calcScreenSize()
		const link = this.getMesh('link')
		const linkGeo = link.geometry as THREE.PlaneGeometry
		const x = width / 2 - linkGeo.parameters.width / 2 - 0.1
		const y = -(height / 2) + linkGeo.parameters.height / 2 + 0.1
		return { x, y, z: 0.01 }
	}

	private createModel() {
		// screen plane
		const screenGeo = new THREE.PlaneGeometry(1, 1)
		const screenMat = new THREE.ShaderMaterial({
			uniforms: {
				u_current: {
					value: { data: this.images[0], uvScale: this.calcCoveredTextureScale(this.images[0], this.size.aspect) },
				},
				u_next: {
					value: { data: this.images[1], uvScale: this.calcCoveredTextureScale(this.images[1], this.size.aspect) },
				},
				u_progress: { value: 0 },
			},
			vertexShader: screenVert,
			fragmentShader: screenFrag,
		})
		const screenMesh = new THREE.Mesh(screenGeo, screenMat)
		const { width, height } = this.calcScreenSize()
		screenMesh.scale.set(width, height, 1)
		screenMesh.name = 'screen'
		this.scene.add(screenMesh)

		// wobble sphere
		const sphereGeo = new THREE.IcosahedronGeometry(0.8, 32)
		const sphereMat = new THREE.ShaderMaterial({
			uniforms: {
				u_texture: { value: null },
				u_screenCoord: { value: this.calcScreenCoord() },
				u_time: { value: 0 },
				u_refractPower: { value: 0 },
			},
			vertexShader: sphereVert,
			fragmentShader: sphereFrag,
		})
		const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat)
		sphereMesh.name = 'sphere'
		this.scene.add(sphereMesh)

		gui.add(sphereMat.uniforms.u_refractPower, 'value', 0, 1, 0.01).name('refract power')
		gui.close()

		// git link
		const linkGeo = new THREE.PlaneGeometry(0.2, 0.2)
		const linkMat = new THREE.MeshBasicMaterial({ map: this.assets.github.data as THREE.Texture, transparent: true })
		const linkMesh = new THREE.Mesh(linkGeo, linkMat)
		linkMesh.name = 'link'
		this.scene.add(linkMesh)
		const pos = this.calcLinkPosition()
		linkMesh.position.set(pos.x, pos.y, pos.z)
	}

	private getMesh<T extends THREE.Material>(name: string) {
		return this.scene.getObjectByName(name) as THREE.Mesh<THREE.BufferGeometry, T>
	}

	private createGsapAnimation() {
		const screen = this.getMesh<THREE.ShaderMaterial>('screen')
		const uniforms = screen.material.uniforms

		gsap.fromTo(
			uniforms.u_progress,
			{ value: 0 },
			{
				value: 1,
				duration: 5,
				ease: 'power3.out',
				repeat: -1,
				repeatDelay: 2,
				delay: 3,
				onRepeat: () => {
					this.currentImageIndex = this.currentImageIndex < this.images.length - 1 ? this.currentImageIndex + 1 : 0
					const nextImageIndex = this.currentImageIndex < this.images.length - 1 ? this.currentImageIndex + 1 : 0

					uniforms.u_current.value.data = this.images[this.currentImageIndex]
					uniforms.u_current.value.uvScale = this.calcCoveredTextureScale(
						this.images[this.currentImageIndex],
						this.size.aspect,
					)
					uniforms.u_next.value.data = this.images[nextImageIndex]
					uniforms.u_next.value.uvScale = this.calcCoveredTextureScale(this.images[nextImageIndex], this.size.aspect)
				},
			},
		)
	}

	private addEnvets() {
		window.addEventListener('pointerdown', () => {
			if (this.hoveredLink) {
				window.open('https://github.com/nemutas/', '_blank', 'noopener noreferrer')
			}
		})
	}

	private intersect(target: THREE.Mesh) {
		this.raycaster.setFromCamera(this.pointer.set(mouse2d.position[0], mouse2d.position[1]), this.camera)
		const intersects = this.raycaster.intersectObjects([target])

		if (intersects.length === 1) {
			document.body.style.cursor = 'pointer'
			this.hoveredLink = true
		} else {
			document.body.style.cursor = 'auto'
			this.hoveredLink = false
		}
	}

	private update = () => {
		if (this.isFirst) {
			this.isFirst = false

			this.images.forEach(image => {
				this.scene.background = image
				this.renderer.render(this.scene, this.camera)
			})
			this.observer.readyCanvas = true
		}
		this.scene.background = null

		const dt = this.clock.getDelta()
		const sphere = this.getMesh<THREE.ShaderMaterial>('sphere')
		const link = this.getMesh('link')

		const screenSize = this.calcScreenSize()
		const mouse = { x: mouse2d.position[0] * (screenSize.width / 2), y: mouse2d.position[1] * (screenSize.height / 2) }
		sphere.position.x = THREE.MathUtils.lerp(sphere.position.x, mouse.x, 0.1)
		sphere.position.y = THREE.MathUtils.lerp(sphere.position.y, mouse.y, 0.1)

		sphere.material.uniforms.u_time.value += dt
		sphere.visible = false
		link.visible = true

		this.renderer.setRenderTarget(this.renderTarget)
		this.renderer.render(this.scene, this.camera)
		sphere.material.uniforms.u_texture.value = this.renderTarget.texture
		this.renderer.setRenderTarget(null)

		sphere.visible = true
		link.visible = false

		this.intersect(link)
	}

	dispose() {
		super.dispose()
		gui.destroy()
		mouse2d.dispose()
	}
}
