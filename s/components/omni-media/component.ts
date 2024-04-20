import {html} from "@benev/slate"

import {styles} from "./styles.js"
import loadingSvg from "../../icons/loading.svg.js"
import addSvg from "../../icons/gravity-ui/add.svg.js"
import binSvg from "../../icons/gravity-ui/bin.svg.js"
import {shadow_component} from "../../context/slate.js"
import importFileSvg from "../../icons/import-file.svg.js"
import {loadingPlaceholder} from "../../views/loading-placeholder/view.js"
import audioWaveSvg from "../../icons/material-design-icons/audio-wave.svg.js"
import {Audio, AudioFile, Image, ImageFile, Video, VideoFile} from "./types.js"

export const OmniMedia = shadow_component(use => {
	use.watch(() => use.context.state.timeline)
	use.styles(styles)
	const media_controller = use.context.controllers.media
	const managers = use.context.controllers.compositor.managers
	const [media, setMedia, getMedia] = use.state<(Video | Image | Audio)[]>([])
	const [placeholders, setPlaceholders] = use.state<any[]>([])

	use.mount(() => {
		media_controller.get_imported_files().then(async media => {
			setPlaceholders(Array.apply(null, Array(media.length)))
			const video_files = media.filter(({kind}) => kind === "video") as VideoFile[]
			const image_files = media.filter(({kind}) => kind === "image") as ImageFile[]
			const audio_files = media.filter(({kind}) => kind === "audio") as AudioFile[]
			const video_elements = await media_controller.create_videos_from_video_files(video_files)
			const image_elements = media_controller.create_image_elements(image_files)
			const audio_elements = media_controller.create_audio_elements(audio_files)
			setMedia([...getMedia(), ...video_elements, ...image_elements, ...audio_elements])
		})
		const unsub = media_controller.on_media_change(async (change) => {
			if(change.action === "added") {
				const video_files = change.files.filter(({kind}) => kind === "video") as VideoFile[]
				const image_files = change.files.filter(({kind}) => kind === "image") as ImageFile[]
				const audio_files = media.filter(({kind}) => kind === "audio") as AudioFile[]
				const video_elements = await media_controller.create_videos_from_video_files(video_files)
				const image_elements = media_controller.create_image_elements(image_files)
				const audio_elements = media_controller.create_audio_elements(audio_files)
				setMedia([...getMedia(), ...video_elements, ...image_elements, ...audio_elements])
			}
			if(change.action === "removed") {
				change.files.forEach(file => {
					const filtered = getMedia().filter(a => a.hash !== file.hash)
					setMedia(filtered)
				})
			}
		})
		return () => unsub()
	})

	const video_on_pointer = {
		enter(video: HTMLVideoElement) {
			video.play()
		},
		leave(video: HTMLVideoElement) {
			video.pause()
			video.currentTime = 0
		}
	}

	const render_video_element = (video: Video) => {
		return html`
			<div
				@pointerenter=${() => video_on_pointer.enter(video.element)}
				@pointerleave=${() => video_on_pointer.leave(video.element)}
				class="box"
			>
				<div class="media-element">
					${video.element}
					<div @click=${() => managers.videoManager.create_and_add_video_effect(video, use.context.state.timeline)} class="add-btn">${addSvg}</div>
					<div @click=${() => media_controller.delete_file(video)} class="delete-btn">${binSvg}</div>
				</div>
				<span class="media-name">${video.file.name}</span>
			</div>
		`
	}

	const render_image_element = (image: Image) => {
		return html`
			<div class="box"
			>
				<div class="media-element">
					${image.element}
					<div @click=${() => managers.imageManager.add_image_effect(image, use.context.state.timeline)} class="add-btn">${addSvg}</div>
					<div @click=${() => media_controller.delete_file(image)} class="delete-btn">${binSvg}</div>
				</div>
				<span class="media-name">${image.file.name}</span>
			</div>
		`
	}

	const render_audio_element = (audio: Audio) => {
		return html`
			<div class="box"
			>
				<div class="media-element audio">
					${audio.element}
					${audioWaveSvg}
					<div @click=${() => managers.audioManager.add_audio_effect(audio, use.context.state.timeline)} class="add-btn">${addSvg}</div>
					<div @click=${() => media_controller.delete_file(audio)} class="delete-btn">${binSvg}</div>
				</div>
				<span class="media-name">${audio.file.name}</span>
			</div>
		`
	}

	return loadingPlaceholder(use.context.helpers.ffmpeg.is_loading.value, () => html`
		<form>
			<label class="import-btn" for="import">${importFileSvg} Import Multimedia</label>
			<input type="file" accept="image/*, video/mp4, .mp3" id="import" class="hide" @change=${(e: Event) => media_controller.import_file(e.target as HTMLInputElement)}>
		</form>
		<div class="media">
			${media.length === 0
				? placeholders.map(_ => html`<div class="box placeholder">${loadingSvg}</div>`)
				: null}
			${media.map((media) => {
				if(media.kind === "video")
					return render_video_element(media)
				if(media.kind === "image")
					return render_image_element(media)
				if(media.kind === "audio")
					return render_audio_element(media)
			})}
		</div>
	`)
})

