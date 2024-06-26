import {VideoEffect} from "../../../types.js"
import {MP4Demuxer} from "../../../../tools/mp4boxjs/demuxer.js"

let timestamp = 0
let end_timestamp = 0
let wait_time = 0
let interval_number = 0
let decoded_effect: VideoEffect
let frames = 0
let timestamp_start = 0
let timebase = 25

const decoder = new VideoDecoder({
	output(frame) {
		timestamp += (decoded_effect.duration / decoded_effect.frames)
		if(timestamp >= timestamp_start + decoded_effect.start && timestamp <= timestamp_start + decoded_effect.end + 100) {
			self.postMessage({action: "new-frame", frame: {timestamp: timestamp - decoded_effect.start, frame, effect_id: decoded_effect.id, frames_count: frames}}, [frame])
			frame.close()
			wait_time = 0
		} else {
			frame.close()
		}
	},
	error: (e) => console.log(e)
})

const interval = () => setInterval(async () => {
	wait_time += 100
	if(wait_time === 200) {
		if(decoder.state === "configured")
			await decoder.flush()
	}
	if(timestamp >= end_timestamp) {
		clearInterval(interval_number)
	}
}, 100)

const demux = (file: File) => new MP4Demuxer(file, {
	async onConfig(config: VideoDecoderConfig) {
		decoder.configure({...config})
		await decoder.flush()
	},
	async onChunk(chunk: EncodedVideoChunk) {
		decoder.decode(chunk)
	},
	framesCount(frames_count) {
		frames = frames_count
	},
	setStatus() {}
})

self.addEventListener("message", async message => {
	if(message.data.action === "demux") {
		timestamp_start = message.data.starting_timestamp
		decoded_effect = message.data.effect
		timestamp = message.data.starting_timestamp
		end_timestamp = (message.data.starting_timestamp) + message.data.effect.end
		interval_number = interval()
		timebase = message.data.timebase
		demux(message.data.effect.file)
	}
})
