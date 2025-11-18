interface PostVideoPlayerProps {
  videoUrl?: string
}

export default function PostVideoPlayer({ videoUrl }: PostVideoPlayerProps) {
  if (!videoUrl) return null

  return (
    <div className="my-2">
      <video src={videoUrl} controls className="w-full max-h-[500px] rounded">
        <track kind="captions" srcLang="en" label="English captions" default />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
