import fs from 'fs'
import path from 'path'

export async function saveJsonToFile(
  data: string | object,
  filePath: string
): Promise<void> {
  // Ensure the directory exists
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export async function readJsonFromFile<T>(filePath: string): Promise<T | null> {
  if (!fs.existsSync(filePath)) {
    return null
  }
  const fileContent = await fs.promises.readFile(filePath, 'utf-8')
  try {
    const data: T = JSON.parse(fileContent)
    return data
  } catch (error) {
    console.error(`Error parsing JSON from file ${filePath}:`, error)
    return null
  }
}

export async function downloadFile({
  url,
  filePath,
  overwrite = false,
}: {
  url: string
  filePath: string
  overwrite?: boolean
}): Promise<boolean> {
  const MAX_RETRIES = 3
  let attempt = 1
  let err = null

  while (attempt <= MAX_RETRIES) {
    try {
      // Ensure the directory exists
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      const fileExists = fs.existsSync(filePath)

      // Only download if file doesn't exist or overwrite is true
      if (!fileExists || overwrite) {
        const response = await fetch(url)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          fs.writeFileSync(filePath, buffer)
          return true
        } else {
          throw new Error(
            `Failed to download file: ${response.status} ${
              response.statusText
            }. Response: ${await response.text()}`
          )
        }
      }

      return false
    } catch (error) {
      console.error(`Error downloading file from ${url}:`, error)
      err = error
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying download. Attempt ${attempt + 1}/${MAX_RETRIES}.`)
      }
      attempt++
    }
  }

  if (err) {
    console.error(`Max retries reached. Last error:`, err)
    throw err
  }

  return false
}

export function safeName(name: string) {
  // keep alphanumerics, dash, underscore; fallback to timestamp
  const cleaned = name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-')
  return cleaned || `${Date.now()}`
}

export async function ensureDir(dirPath: string) {
  await fs.promises.mkdir(dirPath, { recursive: true })
}

export async function removeDir(dirPath: string) {
  if (fs.existsSync(dirPath)) {
    await fs.promises.rm(dirPath, { recursive: true, force: true })
  }
}
