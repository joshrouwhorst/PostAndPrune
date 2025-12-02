'use client'

import Post from '@/components/Post'
import type { PostDisplayData } from '@/types/types'
import Spinner from './Spinner'

interface PostListProps {
  posts?: PostDisplayData[]
  isLoading?: boolean
  children?: React.ReactNode
}

export default function PostList({
  children,
  posts = [],
  isLoading = false,
}: PostListProps) {
  if (isLoading) {
    return <Spinner />
  }

  if ((!posts || posts.length === 0) && children) {
    return <div>{children}</div>
  } else if (!posts || posts.length === 0) {
    return <div className="text-center text-lg text-gray-500">No posts</div>
  }

  console.log('Posts', posts)

  return (
    <div className="relative">
      <ul className="flex flex-col items-center">
        {posts?.map((post) => (
          <li key={post.postId} className="w-full mb-4">
            <Post displayData={post} />
          </li>
        ))}
      </ul>
    </div>
  )
}
