import { Platform } from "react-native"
import Toast from "react-native-toast-message"
import RNFetchBlob from "rn-fetch-blob"

interface MediaItem {
  contentId: number
  id: number
  link: string
  title: string
  tvId: number
  type: string
}

export const getFilePath = (item: MediaItem): string => {
  // Determine file extension based on type
  const extension = item.type.toLowerCase().includes("video") ? "mp4" : "jpg"
  const sanitizedTitle = item.title.replace(/[^a-zA-Z0-9]/g, "_")
  const fileName = `${item.tvId}_${sanitizedTitle}.${extension}`

  // Use the correct storage path for each platform
  if (Platform.OS === "android") {
    return `${RNFetchBlob.fs.dirs.DocumentDir}/${fileName}`
  } else {
    return `${RNFetchBlob.fs.dirs.DocumentDir}/${fileName}`
  }
}

const extractGoogleDriveFileId = (url: string): string => {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/, // Format: .../file/d/FILE_ID/...
    /id=([a-zA-Z0-9_-]+)/, // Format: ...?id=FILE_ID&...
    /\/open\?id=([a-zA-Z0-9_-]+)/, // Format: .../open?id=FILE_ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) return match[1]
  }
  throw new Error("Invalid Google Drive URL format")
}

const getGoogleDriveDirectLink = (fileId: string): string => {
  // Use the export=download parameter to force download
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

export const downloadFiles = async (items: MediaItem[]) => {
  try {
    await Promise.all(
      items.map(async (item) => {
        try {
          const filePath = getFilePath(item)
          console.log("Downloading to path:", filePath)

          // Check if file exists
          const fileExists = await RNFetchBlob.fs.exists(filePath)
          if (fileExists) {
            await RNFetchBlob.fs.unlink(filePath) // Always redownload to ensure fresh content
          }

          // Get the Google Drive direct download link
          const fileId = extractGoogleDriveFileId(item.link)
          const downloadUrl = getGoogleDriveDirectLink(fileId)

          // First request to get cookies/confirmation token
          const cookieResponse = await RNFetchBlob.config({
            followRedirect: false,
          }).fetch("GET", downloadUrl)

          const cookies = cookieResponse.info().headers["set-cookie"] || []
          const confirmCookie = cookies.find((cookie: string) =>
            cookie.includes("download_warning"),
          )

          let finalUrl = downloadUrl
          if (confirmCookie) {
            const match = confirmCookie.match(/download_warning=([^;]+)/)
            if (match?.[1]) {
              finalUrl = `${downloadUrl}&confirm=${match[1]}`
            }
          }

          // Download file with proper headers
          const response = await RNFetchBlob.config({
            fileCache: true,
            path: filePath,
            appendExt: item.type.toLowerCase().includes("video") ? "mp4" : "jpg",
          }).fetch("GET", finalUrl, {
            "Cookie": cookies.join("; "),
            "User-Agent": "Mozilla/5.0",
            "Accept": "*/*",
          })

          // Verify download
          const downloadedStats = await RNFetchBlob.fs.stat(filePath)
          if (!downloadedStats || downloadedStats.size === 0) {
            throw new Error("Downloaded file is empty")
          }

          console.log("Successfully downloaded:", item.title, "Size:", downloadedStats.size)
          Toast.show({
            type: "success",
            text1: "Download Complete",
            text2: `File downloaded: ${item.title}`,
          })
        } catch (err) {
          console.error("Failed to download file:", item.title, err)
          Toast.show({
            type: "error",
            text1: "Download Error",
            text2: `Failed to download file: ${item.title}`,
          })
          throw err
        }
      }),
    )
  } catch (err) {
    console.error("Error during download process:", err)
    Toast.show({
      type: "error",
      text1: "Download Failed",
      text2: "Could not download media files",
    })
    throw err
  }
}
