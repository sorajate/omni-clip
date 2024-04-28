import {AnyEffect} from "../../timeline/types.js"
import {Compositor} from "../../compositor/controller.js"
import {TimelineActions} from "../../timeline/actions.js"
import {FFmpegHelper} from "../helpers/FFmpegHelper/helper.js"

export class Encoder {
	#encode_worker = new Worker(new URL("./encode_worker.js", import.meta.url), {type: "module"})
	#ffmpeg: FFmpegHelper
	file: Uint8Array | null = null

	constructor(private actions: TimelineActions, private compositor: Compositor) {
		this.#ffmpeg = new FFmpegHelper(actions)
	}

	export_process_end(effects: AnyEffect[]) {
		this.actions.set_export_status("flushing")
		this.#encode_worker.postMessage({action: "get-binary"})
		this.#encode_worker.onmessage = async (msg) => {
			if(msg.data.action === "binary") {
				const output_name = "output.mp4"
				await this.#ffmpeg.write_composed_data(msg.data.binary, "composed.h264")
				await this.#ffmpeg.merge_audio_with_video_and_mux(effects, "composed.h264", "output.mp4", this.compositor)
				const muxed_file = await this.#ffmpeg.get_muxed_file(output_name)
				this.file = muxed_file
				this.actions.set_export_status("complete")
			}
		}
		return
	}

	async encode_composed_frame(canvas: HTMLCanvasElement, timestamp: number) {
		const frame = new VideoFrame(canvas, this.#frame_config(canvas, timestamp))
		this.#encode_worker.postMessage({frame, action: "encode"})
		frame.close()
	}

	#frame_config(canvas: HTMLCanvasElement, timestamp: number): VideoFrameInit {
		return {
			displayWidth: canvas.width,
			displayHeight: canvas.height,
			duration: 1000/this.compositor.timebase,
			timestamp: timestamp * 1000
		}
	}

	configure([width, height]: number[]) {
		this.#encode_worker.postMessage({action: "configure", width, height})
	}

}
