/** biome-ignore-all lint/suspicious/noArrayIndexKey: see code */
'use client'

import type { PostMedia } from '@/types/types'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from './ui/forms'

interface PostMediaCarouselProps {
  media?: PostMedia[] | undefined
}

export default function PostMediaCarousel({ media }: PostMediaCarouselProps) {
  const [imageIndex, setImageIndex] = useState(0)
  if (!media || media.length === 0) {
    return null
  }

  if (media.length === 1) {
    const image = media[0]
    return (
      <div
        className="w-full my-2"
        style={{
          position: 'relative',
          aspectRatio: `${image.width} / ${image.height}`,
        }}
      >
        <Image
          src={image.url}
          alt={'Embedded image'}
          className="w-full h-auto rounded"
          fill
          sizes="100vw"
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  return (
    <div className="w-full my-2">
      <div className="relative">
        <div
          className="relative w-full"
          style={{
            aspectRatio: `${media[imageIndex].width} / ${media[imageIndex].height}`,
          }}
        >
          <Image
            src={media[imageIndex].url}
            alt={'Embedded image'}
            fill
            sizes="100vw"
            className="rounded object-cover"
            loading="lazy"
          />
        </div>

        {/* Navigation buttons */}
        <Button
          variant="icon"
          onClick={() =>
            setImageIndex(
              (prev) => (prev - 1 + (media.length || 0)) % (media.length || 1),
            )
          }
          className="absolute left-2 top-1/2 transform -translate-y-1/2 border border-primary"
        >
          <ArrowLeft />
        </Button>
        <Button
          variant="icon"
          onClick={() =>
            setImageIndex((prev) => (prev + 1) % (media.length || 1))
          }
          className="absolute right-2 top-1/2 transform -translate-y-1/2 border border-primary"
        >
          <ArrowRight />
        </Button>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center mt-2 space-x-1">
        {media.map((_, index) => (
          <button
            type="button"
            key={index}
            onClick={() => setImageIndex(index)}
            className={`w-2 h-2 rounded-full ${
              index === imageIndex ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
