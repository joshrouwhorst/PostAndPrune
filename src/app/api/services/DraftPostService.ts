import { addPost as addPostToBsky } from '@/app/api-helpers/auth/BlueskyAuth'
import {
  DEFAULT_GROUP,
  DEFAULT_POST_SLUG,
  DRAFT_MEDIA_ENDPOINT,
  getPaths,
} from '@/config/main'
import type { Account } from '@/types/accounts'
import type {
  CreateDraftInput,
  DraftMedia,
  DraftMediaFileInput,
  DraftMeta,
  DraftPost,
} from '@/types/drafts'
import type { Schedule } from '@/types/scheduler'
import { Jimp } from 'jimp'
import fs from 'node:fs/promises'
import path from 'node:path'
import Logger from '../../api-helpers/logger'
import { ensureDir, removeDir, safeName } from '../../api-helpers/utils'
import { getCache, setCache } from '../services/CacheService'
import {
  checkIfExists,
  copyFileOrDirectory,
  deleteFileOrDirectory,
  listFiles,
  moveFileOrDirectory,
  readText,
  writeFile,
} from './FileService'
import { getAccounts } from './SettingsService'

const META_FILENAME = 'meta.json'
const TEXT_FILENAME = 'post.txt'
const MEDIA_DIRNAME = 'media'

const CACHE_ID = 'DraftPostService'

const logger = new Logger('DrPostServ')
const { draftPostsPath } = getPaths()

let _cache = getCache<DraftPost[] | null>(CACHE_ID)
let _cacheTime = 0
const _cacheDuration = 5 * 60 * 1000 // 5 minutes

if (!_cache) {
  _cache = setCache(CACHE_ID, [] as DraftPost[]) // 5 minutes
}

init()

async function init() {
  logger.log('DraftPostService initialized.')
}

export async function getDraftPostsInGroup(
  group: string
): Promise<DraftPost[]> {
  const posts = await getDraftPosts()
  return posts.filter((p) => p.group === group)
}

export async function getDraftPostsInSchedule(
  schedule: Schedule
): Promise<DraftPost[]> {
  if (!schedule.group) {
    return []
  }

  try {
    let posts = await getDraftPosts()
    posts = posts.filter((p) => p.group === schedule.group)

    // IDs in the order defined by the schedule
    // If the post isn't already in here, then they go to end
    const postOrder = schedule.postOrder || []

    const orderedPosts = posts.sort((a, b) => {
      if (!postOrder || postOrder.length === 0) return 0
      const indexA = postOrder.indexOf(a.meta.directoryName)
      const indexB = postOrder.indexOf(b.meta.directoryName)
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
    return orderedPosts
  } catch (err) {
    logger.error('Error getting draft posts in schedule:', err)
    // No order, just return empty array
    return []
  }
}

export async function getDraftPosts(): Promise<DraftPost[]> {
  // simple caching to avoid repeated reads
  const now = Date.now()
  if (_cache && now - _cacheTime < _cacheDuration) {
    console.log('Using cached posts list')
    return _cache as DraftPost[]
  }
  await ensureDir(draftPostsPath)
  const entries = await listFiles(draftPostsPath)
  const results: DraftPost[] = []

  for (const entry of entries) {
    if (
      entry.isDirectory &&
      !entry.name.startsWith('@eaDir') &&
      !entry.name.startsWith('.') &&
      !entry.name.startsWith('$')
    ) {
      const p = await getDraftPost(entry.name, draftPostsPath)
      if (p) {
        results.push(p)
        continue // move to next entry
      }

      // Might be a group directory
      const groupPath = path.join(draftPostsPath, entry.name)
      const groupEntries = await listFiles(groupPath)
      const postDirs = groupEntries
        .filter((d) => d.isDirectory)
        .filter(
          (d) =>
            !d.name.startsWith('@eaDir') &&
            !d.name.startsWith('.') &&
            !d.name.startsWith('$')
        )
        .map((d) => d.name)

      for (const postDirName of postDirs) {
        const p = await getDraftPost(postDirName, entry.name)
        if (p) {
          p.group = entry.name
          results.push(p)
        }
      }
    }
  }

  // optionally sort by createdAt descending
  results.sort((a, b) => (a.meta.createdAt < b.meta.createdAt ? 1 : -1))
  _cache = setCache(CACHE_ID, results)
  _cacheTime = Date.now()
  return results
}

export async function getDraftPost(
  id: string,
  group?: string,
  noCache: boolean = false
): Promise<DraftPost | null> {
  // If there's no group check all the groups for the post
  if (!group) {
    const groups = await listGroups()
    for (const g of groups) {
      const post = await getDraftPost(id, g)
      if (post) return post
    }
    return null
  }

  const fullPath = group
    ? path.join(draftPostsPath, group, id)
    : path.join(draftPostsPath, id)

  const cached = _cache?.find((p) => p.fullPath === fullPath)
  if (!noCache && cached) return cached

  const metaExists = await checkIfExists(path.join(fullPath, META_FILENAME))

  if (!metaExists) {
    // No meta.json means this is not a valid post directory
    return null
  }

  const metaRaw = await readText(path.join(fullPath, META_FILENAME))

  if (!metaRaw) {
    throw new Error('meta.json not found or empty')
  }

  const meta = JSON.parse(metaRaw) as DraftMeta

  // Load text from text file
  const text = await readPostText(fullPath)

  const { images, video } = await readMedia(fullPath)

  const post = {
    fullPath: fullPath,
    group: group || '',
    meta: { ...meta, text, images: images || [], video: video || null },
  } as DraftPost

  if (_cache) {
    // Find and replace or add to cache
    const index = _cache.findIndex((p) => p.fullPath === post.fullPath)
    if (index !== -1) {
      _cache[index] = post
    } else {
      _cache.unshift(post)
    }

    _cache = setCache(CACHE_ID, _cache)
  }

  return post
}

export async function createDraftPost(
  input: CreateDraftInput
): Promise<DraftPost> {
  const text = input.text || ''
  const inputImages = input.images ?? []
  if (inputImages.length > 4) throw new Error('max 4 images allowed')

  if (input.video && input.video.kind !== 'video') {
    throw new Error("video kind must be 'video'")
  }

  if (!input.group) {
    input.group = DEFAULT_GROUP
  }

  // choose id and directory names
  const createdAt = input.createdAt ?? new Date().toISOString()

  const {
    directoryName,
    slug,
    fullPath: postDir,
  } = generateDirPath({
    createdAt,
    root: draftPostsPath,
    slug: input.slug,
    group: input.group,
  })
  input.slug = slug

  const mediaDir = path.join(postDir, MEDIA_DIRNAME)

  await ensureDir(mediaDir)

  // save text to markdown file
  if (text) {
    await writeText(postDir, text)
  }

  // save images (if any)
  for (let i = 0; i < inputImages.length; i++) {
    await addImage(inputImages[i], i, mediaDir)
  }

  // save video (if any)
  if (input.video) {
    const vid = input.video
    const ext = extFromFilename(vid.filename) || '.mp4'
    const fname = `video${ext}`
    const outPath = path.join(mediaDir, fname)

    // Convert data to Buffer if it's not already
    const bufferData = Buffer.isBuffer(vid.data)
      ? vid.data
      : Buffer.from(vid.data)

    await writeFile(outPath, bufferData)
  }

  const { images, video } = await readMedia(postDir)

  const meta: DraftMeta = {
    directoryName,
    slug: input.slug,
    createdAt,
    mediaDir: MEDIA_DIRNAME,
    images: images || [],
    video: video || null,
    extra: input.extra ?? {},
    priority: -1,
  }

  await writeMeta(postDir, meta)

  // Return post with text loaded from file
  const postText = await readPostText(postDir)
  logger.log(
    `Created draft post ${directoryName} in ${input.group || 'no group'}.`
  )

  const post = {
    fullPath: postDir,
    meta: { ...meta, text: postText },
    group: input.group,
  } as DraftPost

  if (_cache) {
    _cache.unshift(post)
  }

  return post
}

export async function deleteDraftPost(id: string): Promise<void> {
  logger.log(`Deleting draft post ${id}.`)
  const post = await getDraftPost(id)
  if (!post) throw new Error('Post not found')
  await deleteFileOrDirectory(post.fullPath)

  if (_cache) {
    _cache = setCache(
      CACHE_ID,
      _cache.filter((p) => p.fullPath !== post.fullPath)
    )
  }
}

export async function duplicateDraftPost(id: string): Promise<DraftPost> {
  logger.log(`Duplicating draft post ${id}.`)
  const post = await getDraftPost(id)
  if (!post) {
    logger.log(`Draft post ${id} not found for duplication.`)
    throw new Error('Post not found')
  }

  const createdAt = new Date().toISOString()

  const {
    directoryName: newDirectoryName,
    slug,
    fullPath,
  } = generateDirPath({
    createdAt,
    root: draftPostsPath,
    slug: post.meta.slug,
    group: post.group,
  })

  // Copy all files and subdirectories from old dir to new dir, except 'media'
  async function copyRecursive(src: string, dest: string) {
    await ensureDir(dest)
    const entries = await listFiles(src)
    for (const entry of entries) {
      if (entry.isDirectory && entry.name === MEDIA_DIRNAME) {
        // Skip the 'media' directory
        continue
      }
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      if (entry.isDirectory) {
        try {
          await copyRecursive(srcPath, destPath)
        } catch (err) {
          logger.error(
            `Failed to copy directory ${srcPath} to ${destPath}`,
            err
          )
          throw err
        }
      } else {
        try {
          await copyFileOrDirectory(srcPath, destPath)
        } catch (err) {
          logger.error(`Failed to copy file ${srcPath} to ${destPath}`, err)
          throw err
        }
      }
    }
  }

  try {
    await copyRecursive(post.fullPath, fullPath)
  } catch (err) {
    await removeDir(fullPath) // Cleanup
    throw err
  }

  // Update meta.json with new id and createdAt
  const metaPath = path.join(fullPath, META_FILENAME)
  const metaRaw = await readText(metaPath)
  if (!metaRaw) throw new Error('Failed to read meta.json of duplicated post')
  const meta: DraftMeta = JSON.parse(metaRaw)
  meta.directoryName = newDirectoryName
  meta.slug = slug
  meta.createdAt = createdAt
  await writeFile(metaPath, JSON.stringify(meta, null, 2))

  // Load duplicated post
  const duplicated = await getDraftPost(newDirectoryName, post.group, true)
  if (!duplicated) throw new Error('Failed to duplicate post')
  duplicated.group = post.group
  return duplicated
}

export async function updateDraftPost(
  directoryName: string,
  input: CreateDraftInput
): Promise<DraftPost | null> {
  logger.log(`Updating draft post ${directoryName}.`)
  const posts = await getDraftPosts()
  const post = posts.find((p) => p.meta.directoryName === directoryName)
  if (!post) throw new Error('Cannot find post to update')

  // If the id is changing, we need to rename the directory
  if (post.meta.slug !== input.slug) {
    const {
      directoryName: newDirectoryName,
      slug,
      fullPath,
    } = generateDirPath({
      createdAt: post.meta.createdAt,
      root: draftPostsPath,
      slug: input.slug,
      group: input.group,
    })
    await updatePostDirectoryName(post.fullPath, fullPath)
    //await wait(2000)
    input.slug = slug
    post.meta.slug = slug
    post.fullPath = fullPath
    post.meta.directoryName = newDirectoryName
  }

  // Update text file if text is provided
  if (input.text !== undefined) {
    if (input.text) {
      await writeText(post.fullPath, input.text)
    } else {
      // Remove text file if text is empty
      try {
        await deleteFileOrDirectory(path.join(post.fullPath, TEXT_FILENAME))
      } catch {
        // File might not exist, that's okay
      }
    }
  }

  if (post.group !== input.group) {
    logger.log(
      `Moving draft post ${directoryName} from group ${post.group} to ${input.group}.`
    )
    await movePostToGroup(post, input.group || DEFAULT_GROUP)
  }

  const mediaPath = path.join(post.fullPath, MEDIA_DIRNAME)

  if (input.images) {
    // Delete the media directory and old items
    await deleteFileOrDirectory(mediaPath)

    // Add new images
    await ensureDir(mediaPath)
    for (let i = 0; i < input.images.length; i++) {
      await addImage(input.images[i], i, mediaPath)
    }
  }

  if (input.video) {
    // Delete the media directory and old items
    await deleteFileOrDirectory(mediaPath)
    await ensureDir(mediaPath)

    // Add new video
    await addVideo(input.video, mediaPath)
  }

  await writeMeta(post.fullPath, post.meta)

  // Make sure we're updating the cache
  return await getDraftPost(post.meta.directoryName, post.group, true)
}

export async function getGroups(): Promise<string[]> {
  return listGroups()
}

export async function readMediaFile(
  post: DraftPost,
  filePath: string
): Promise<Buffer> {
  const p = path.join(post.fullPath, post.meta.mediaDir, filePath)
  return fs.readFile(p)
}

export async function publishDraftPost({
  id,
  accounts,
  accountIds,
}: {
  id: string
  accounts?: Account[]
  accountIds?: string[]
}): Promise<void> {
  if (!accounts && !accountIds)
    throw new Error('Either accounts or accountIds must be provided')

  const post = await getDraftPost(id)
  if (!post) throw new Error('Post not found')

  if (accountIds && accountIds.length > 0) {
    const allAccounts = await getAccounts()
    accounts = allAccounts.filter((acc) => accountIds.includes(acc.id))
  } else {
    accounts = accounts || []
  }

  if (!accounts || accounts.length === 0) {
    throw new Error('No valid accounts found for publishing')
  }

  for (const account of accounts) {
    await sendToAccount(post, account)
  }
}

async function sendToAccount(post: DraftPost, account: Account): Promise<void> {
  // Implement actual social media posting logic here
  // This would integrate with platform-specific APIs
  switch (account.platform) {
    case 'bluesky':
      // Integrate with Bluesky API
      await addPostToBsky(post, account)
      await movePostToPublished(post)
      break
    default:
      throw new Error(
        `Account ${account.name} is using unsupported platform ${account.platform}.`
      )
  }
}

export async function reorderGroupPosts(
  group: string,
  newOrder: string[]
): Promise<void> {
  logger.log(`Reordering posts for group ${group}.`, { newOrder })
  const postsToReorder = await getDraftPostsInGroup(group)

  if (postsToReorder.length !== newOrder.length) {
    throw new Error('New order length does not match number of scheduled posts')
  }

  const idSet = new Set(postsToReorder.map((p) => p.meta.directoryName))
  for (const id of newOrder) {
    if (!idSet.has(id)) {
      throw new Error(`Post ID ${id} is not part of the scheduled posts`)
    }
  }

  const postMap = new Map(postsToReorder.map((p) => [p.meta.directoryName, p]))
  for (let i = 0; i < newOrder.length; i++) {
    const post = postMap.get(newOrder[i])
    if (post) {
      post.meta.priority = i
      const metaPath = path.join(post.fullPath, META_FILENAME)
      await writeFile(metaPath, JSON.stringify(post.meta, null, 2))
    }
  }
}

async function writeMeta(directoryPath: string, meta: DraftMeta) {
  const p = path.join(directoryPath, META_FILENAME)
  await writeFile(p, JSON.stringify(meta, null, 2))
}

async function writeText(dir: string, text: string) {
  const p = path.join(dir, TEXT_FILENAME)
  await writeFile(p, text)
}

async function readPostText(dir: string): Promise<string> {
  const p = path.join(dir, TEXT_FILENAME)
  try {
    const data = await readText(p)
    return data || ''
  } catch {
    return '' // No text file means no text
  }
}

async function readMedia(postDir: string): Promise<{
  images?: DraftMedia[] | undefined
  video?: DraftMedia | undefined
}> {
  const mediaPath = path.join(postDir, MEDIA_DIRNAME)
  await ensureDir(mediaPath)
  const mediaRaw = await listFiles(mediaPath)
  const images: DraftMedia[] = []
  let video: DraftMedia | undefined = undefined

  if (!mediaRaw || mediaRaw.length === 0) {
    return { images: undefined, video: undefined }
  }

  for (const file of mediaRaw) {
    if (file.isDirectory) continue

    const filePath = path.join(mediaPath, file.name)
    const stats = await fs.stat(filePath)

    if (!stats.isFile()) continue

    const ext = path.extname(file.name).toLowerCase()
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
    const isVideo = ['.mp4', '.mov', '.avi', '.webm'].includes(ext)

    if (isImage) {
      const { width, height } = await getImageDimensions(filePath)

      // Build URL path relative to root
      const urlParts = [DRAFT_MEDIA_ENDPOINT]
      const relativePath = path.relative(draftPostsPath, postDir)
      if (relativePath.includes(path.sep)) {
        // Post is in a group
        const pathParts = relativePath.split(path.sep)
        urlParts.push(...pathParts)
      } else {
        // Post is at root level
        urlParts.push(relativePath)
      }
      urlParts.push(MEDIA_DIRNAME, file.name)

      images.push({
        filename: file.name,
        mime: `image/${ext.slice(1)}`,
        kind: 'image',
        width,
        height,
        size: stats.size,
        url: path.join(...urlParts).replace(/\\/g, '/'),
      })
    } else if (isVideo) {
      const { width, height } = await getVideoDimensions(filePath)

      // Build URL path relative to root
      const urlParts = [DRAFT_MEDIA_ENDPOINT]
      const relativePath = path.relative(draftPostsPath, postDir)
      if (relativePath.includes(path.sep)) {
        // Post is in a group
        const pathParts = relativePath.split(path.sep)
        urlParts.push(...pathParts)
      } else {
        // Post is at root level
        urlParts.push(relativePath)
      }
      urlParts.push(MEDIA_DIRNAME, file.name)

      video = {
        filename: file.name,
        mime: `video/${ext.slice(1)}`,
        kind: 'video',
        width,
        height,
        size: stats.size,
        url: path.join(...urlParts).replace(/\\/g, '/'),
      }
    }
  }

  return { images: images.length > 0 ? images : undefined, video }
}

async function getImageDimensions(
  filePath: string
): Promise<{ width: number; height: number; size: number }> {
  try {
    const metadata = await Jimp.read(filePath)
    const stats = await fs.stat(filePath)
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: stats.size || 0,
    }
  } catch {
    // Fallback dimensions if Jimp fails
    return { width: 0, height: 0, size: 0 }
  }
}

async function getVideoDimensions(
  filePath: string
): Promise<{ width: number; height: number; size: number }> {
  try {
    const stats = await fs.stat(filePath)
    // For videos, we can't easily get dimensions without additional libraries
    // Return file size and placeholder dimensions
    return {
      width: 0,
      height: 0,
      size: stats.size,
    }
  } catch {
    // Fallback if file access fails
    return { width: 0, height: 0, size: 0 }
  }
}

async function listGroups(): Promise<string[]> {
  await ensureDir(draftPostsPath)
  const entries = await listFiles(draftPostsPath)
  const groups: string[] = []

  for (const entry of entries) {
    if (
      entry.isDirectory &&
      !entry.name.startsWith('@eaDir') &&
      !entry.name.startsWith('.') &&
      !entry.name.startsWith('$')
    ) {
      // Check if there is a meta.json file directly inside this directory
      const metaPath = path.join(draftPostsPath, entry.name, META_FILENAME)

      try {
        const fileExists = await checkIfExists(metaPath)
        // If we can access meta.json, this is a post directory, not a group
        if (fileExists) continue // skip to next entry
      } catch {
        // No meta.json here, might be a group directory
      }

      // Check if this directory contains any post directories
      const groupPath = path.join(draftPostsPath, entry.name)
      const groupEntries = await listFiles(groupPath)
      const hasPost = groupEntries.some((d) => {
        if (!d.isDirectory) return false
        const metaPath = path.join(groupPath, d.name, META_FILENAME)
        return checkIfExists(metaPath)
      })

      if (hasPost) {
        groups.push(entry.name)
      }
    }
  }

  // Make sure DEFAULT_GROUP is always included
  if (!groups.includes(DEFAULT_GROUP)) {
    groups.push(DEFAULT_GROUP)
  }

  return groups
}

export function generateDirPath({
  createdAt,
  root,
  slug,
  group,
}: {
  createdAt: string
  root: string
  slug?: string
  group?: string
}): { directoryName: string; slug: string; fullPath: string } {
  const newSlug = slug ? safeName(slug) : safeName(DEFAULT_POST_SLUG)
  // Format createdAt as YYYYMMDDHHmmss
  const date = new Date(createdAt)
  const pad = (n: number) => n.toString().padStart(2, '0')
  const formattedDate = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
  const directoryName = `${formattedDate}_${newSlug}`
  const dirItems = group ? [root, group, directoryName] : [root, directoryName]
  return { directoryName, slug: newSlug, fullPath: path.join(...dirItems) }
}

async function addImage(
  image: DraftMediaFileInput,
  index: number,
  mediaDir: string
) {
  const img = image
  const ext = extFromFilename(img.filename) || '.jpg'
  const fname = `image_${index + 1}${ext}`
  const outPath = path.join(mediaDir, fname)

  // Convert data to Buffer if it's not already
  const bufferData = Buffer.isBuffer(img.data)
    ? img.data
    : Buffer.from(img.data)

  await writeFile(outPath, bufferData)
}

async function addVideo(video: DraftMediaFileInput, mediaDir: string) {
  const vid = video
  const ext = extFromFilename(vid.filename) || '.mp4'
  const fname = `video${ext}`
  const outPath = path.join(mediaDir, fname)

  // Convert data to Buffer if it's not already
  const bufferData = Buffer.isBuffer(vid.data)
    ? vid.data
    : Buffer.from(vid.data)

  await writeFile(outPath, bufferData)
}

function extFromFilename(filename: string) {
  return path.extname(filename) || ''
}

async function updatePostDirectoryName(
  oldPath: string,
  newPath: string
): Promise<void> {
  logger.log(`Updating directory name for post ${oldPath} to ${newPath}.`)
  await moveFileOrDirectory(oldPath, newPath)
}

async function movePostToGroup(
  post: DraftPost,
  newGroup: string
): Promise<DraftPost> {
  logger.log(
    `Moving draft post ${post.meta.directoryName} to group ${newGroup}.`
  )
  const groupDir = path.join(draftPostsPath, newGroup)
  await ensureDir(groupDir)

  const baseName = path.basename(post.fullPath)
  const newDir = path.join(groupDir, baseName)

  await moveFileOrDirectory(post.fullPath, newDir)
  post.fullPath = newDir
  post.group = newGroup
  return post
}

async function movePostToPublished(post: DraftPost): Promise<DraftPost> {
  logger.log(`Publishing draft post ${post.meta.directoryName}.`)
  const { publishedPostsPath } = getPaths()
  await ensureDir(publishedPostsPath)
  const newDir = path.join(
    publishedPostsPath,
    ...(post.group ? [post.group] : []),
    path.basename(post.fullPath)
  )

  await ensureDir(newDir)

  await moveFileOrDirectory(post.fullPath, newDir)
  post.fullPath = newDir
  return post
}
