import * as THREE from 'three'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'

export type Assets = {
	[key in string]: {
		data?: THREE.Texture | THREE.VideoTexture | GLTF
		path: string
		encoding?: boolean
		flipY?: boolean
	}
}

export async function loadAssets(assets: Assets) {
	const textureLoader = new THREE.TextureLoader()
	const gltfLoader = new GLTFLoader()
	const rgbeLoader = new RGBELoader()

	const getExtension = (path: string) => {
		const s = path.split('.')
		return s[s.length - 1]
	}

	await Promise.all(
		Object.values(assets).map(async v => {
			const extension = getExtension(v.path)

			if (['jpg', 'png', 'webp'].includes(extension)) {
				const texture = await textureLoader.loadAsync(v.path)
				texture.userData.aspect = texture.image.width / texture.image.height
				v.encoding && (texture.encoding = THREE.sRGBEncoding)
				v.flipY !== undefined && (texture.flipY = v.flipY)
				v.data = texture
			} else if (['glb'].includes(extension)) {
				const gltf = await gltfLoader.loadAsync(v.path)
				v.data = gltf
			} else if (['webm', 'mp4'].includes(extension)) {
				const video = document.createElement('video')
				video.src = v.path
				video.muted = true
				video.loop = true
				video.autoplay = true
				video.preload = 'auto'
				video.playsInline = true
				// await video.play()
				const texture = new THREE.VideoTexture(video)
				texture.userData.aspect = video.videoWidth / video.videoHeight
				v.encoding && (texture.encoding = THREE.sRGBEncoding)
				v.data = texture
			} else if (['hdr'].includes(extension)) {
				const texture = await rgbeLoader.loadAsync(v.path)
				texture.mapping = THREE.EquirectangularReflectionMapping
				v.data = texture
			}
		}),
	)
}
