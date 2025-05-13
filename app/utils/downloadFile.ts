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

  // Use internal app storage which doesn't require special permissions
  if (Platform.OS === "android") {
    // Use app's internal cache directory which is accessible without permissions
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
  // For large files, we need to use the special export=download parameter
  // and handle the confirmation page differently
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

// Helper function to check if a file is HTML without loading the entire file
const isHtmlFile = async (filePath: string): Promise<boolean> => {
  try {
    // Use a simple approach that just checks the file extension
    if (filePath.toLowerCase().endsWith(".html")) {
      return true
    }

    // For files without .html extension, we'll do a simple content check
    // But we'll be conservative to avoid memory issues
    const stats = await RNFetchBlob.fs.stat(filePath)

    // Skip the check for large files to avoid memory issues
    if (stats.size > 1000000) {
      // > 1MB
      return false // Assume large files are not HTML
    }

    // For small files, check content
    if (stats.size < 50000) {
      // < 50KB - likely safe to read fully
      const content = await RNFetchBlob.fs.readFile(filePath, "utf8")
      return (
        content.includes("<!DOCTYPE html>") ||
        content.includes("<html>") ||
        content.includes("<HTML>")
      )
    }

    // For medium files, be conservative
    return false
  } catch (error) {
    console.error("Error checking if file is HTML:", error)
    return false
  }
}

// Helper to check if a file is a valid video
const isValidVideoFile = async (filePath: string): Promise<boolean> => {
  try {
    // Check file size first - videos should be reasonably sized
    const stats = await RNFetchBlob.fs.stat(filePath)

    // Very small files are unlikely to be valid videos
    if (stats.size < 10000) {
      console.log("File too small to be a valid video:", stats.size, "bytes")
      return false
    }

    // Check file extension
    if (
      filePath.toLowerCase().endsWith(".mp4") ||
      filePath.toLowerCase().endsWith(".mov") ||
      filePath.toLowerCase().endsWith(".avi")
    ) {
      // Additional check for very small files - might be HTML
      if (stats.size < 50000) {
        return !(await isHtmlFile(filePath))
      }
      return true
    }

    // If it's HTML, it's definitely not a valid video
    if (await isHtmlFile(filePath)) {
      console.log("HTML detected instead of video")
      return false
    }

    // If it's large enough and not HTML, it might be a valid video
    // We'll be optimistic here
    if (stats.size > 1000000) {
      // Over 1MB
      console.log("File is over 1MB and not HTML, assuming valid video")
      return true
    }

    console.log("Could not verify if file is a valid video")
    return false
  } catch (error) {
    console.error("Error checking if file is a valid video:", error)
    return true // Be optimistic in case of error
  }
}

// Special function for large file downloads from Google Drive
const downloadLargeFileFromGoogleDrive = async (
  fileId: string,
  filePath: string,
): Promise<boolean> => {
  try {
    // Try multiple approaches in sequence until one works

    // Approach 1: Export=download with confirmation token
    console.log("Trying approach 1: export=download with confirmation token")
    const baseUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
    console.log("Initial request to:", baseUrl)

    const cookieResponse = await RNFetchBlob.config({
      followRedirect: false,
    }).fetch("GET", baseUrl)

    const cookies = cookieResponse.info().headers["set-cookie"] || []
    console.log("Cookies received:", cookies.length > 0 ? "yes" : "no")

    let downloadUrl = baseUrl
    const confirmCookie = cookies.find((cookie: string) => cookie.includes("download_warning"))
    if (confirmCookie) {
      const match = confirmCookie.match(/download_warning=([^;]+)/)
      if (match?.[1]) {
        downloadUrl = `${baseUrl}&confirm=${match[1]}`
        console.log("Using confirmation URL:", downloadUrl)
      }
    }

    // Try with confirmation token if available
    if (confirmCookie) {
      console.log("Downloading with confirmation token...")
      const response = await RNFetchBlob.config({
        fileCache: true,
        path: filePath,
        timeout: 300000, // 5 minute timeout
      }).fetch("GET", downloadUrl, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
        "Accept": "video/mp4,video/*;q=0.9,application/octet-stream;q=0.8",
        "Cookie": cookies.join("; "),
      })

      const stats = await RNFetchBlob.fs.stat(filePath)
      console.log("Downloaded file size with approach 1:", stats.size)

      if (await isValidVideoFile(filePath)) {
        console.log("Approach 1 successful! Downloaded valid video file")
        return true
      }

      // Delete the file if it's not valid
      try {
        await RNFetchBlob.fs.unlink(filePath)
        console.log("Deleted invalid file, trying next approach")
      } catch (err) {
        console.error("Failed to delete invalid file:", err)
      }
    }

    // Approach 2: Using direct link with format parameter
    console.log("Trying approach 2: direct link with format parameter")
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&format=mp4`
    console.log("Downloading from:", directUrl)

    try {
      const directResponse = await RNFetchBlob.config({
        fileCache: true,
        path: filePath,
        timeout: 300000,
      }).fetch("GET", directUrl, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
      })

      const directStats = await RNFetchBlob.fs.stat(filePath)
      console.log("Downloaded file size with approach 2:", directStats.size)

      if (await isValidVideoFile(filePath)) {
        console.log("Approach 2 successful! Downloaded valid video file")
        return true
      }

      // Delete the file if it's not valid
      try {
        await RNFetchBlob.fs.unlink(filePath)
        console.log("Deleted invalid file, trying next approach")
      } catch (err) {
        console.error("Failed to delete invalid file:", err)
      }
    } catch (err) {
      console.error("Error with approach 2:", err)
    }

    // Approach 3: Try with a different URL structure
    console.log("Trying approach 3: alternative URL structure")
    try {
      const downloadResponse = await RNFetchBlob.config({
        fileCache: true,
        path: filePath,
        timeout: 300000,
      }).fetch(
        "GET",
        `https://drive.google.com/u/0/uc?id=${fileId}&export=download&confirm=t&format=mp4`,
        {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
          "Range": "bytes=0-",
        },
      )

      const altStats = await RNFetchBlob.fs.stat(filePath)
      console.log("Downloaded file size with approach 3:", altStats.size)

      if (await isValidVideoFile(filePath)) {
        console.log("Approach 3 successful! Downloaded valid video file")
        return true
      }
    } catch (err) {
      console.error("Error with approach 3:", err)
    }

    console.log("All download approaches failed")
    return false
  } catch (error) {
    console.error("Error in downloadLargeFileFromGoogleDrive:", error)
    return false
  }
}

export const downloadFiles = async (items: MediaItem[]) => {
  try {
    // Process downloads sequentially to avoid overloading the system
    for (const item of items) {
      try {
        const filePath = getFilePath(item)
        console.log("Downloading to path:", filePath)

        // Check if file exists
        const fileExists = await RNFetchBlob.fs.exists(filePath)
        if (fileExists) {
          console.log("File already exists:", filePath)

          try {
            // Check if the file is valid (not too small)
            const stats = await RNFetchBlob.fs.stat(filePath)
            if (stats.size < 50000 && item.type.toLowerCase().includes("video")) {
              console.log("Existing file seems too small, re-downloading:", filePath)
              // Try to delete with error handling
              try {
                await RNFetchBlob.fs.unlink(filePath)
              } catch (deleteErr) {
                console.error("Failed to delete existing file:", deleteErr)
                // Continue anyway - we'll try to overwrite the file
              }
            } else {
              continue // Skip download if file exists and seems valid
            }
          } catch (statErr) {
            console.error("Error checking file stats:", statErr)
            // Continue to download if we can't check the file
          }
        }

        // Get the Google Drive file ID
        const fileId = extractGoogleDriveFileId(item.link)
        console.log("Extracted file ID:", fileId)

        let downloadSuccess = false

        // For videos, use our special large file download function
        if (item.type.toLowerCase().includes("video")) {
          console.log("Using special large file download method for video")
          downloadSuccess = await downloadLargeFileFromGoogleDrive(fileId, filePath)

          if (!downloadSuccess) {
            console.log("Special download method failed, trying alternative approach")

            // Try another method - direct API access with a specific file format
            const directApiUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&format=mp4`
            await RNFetchBlob.config({
              fileCache: true,
              path: filePath,
              timeout: 300000,
            }).fetch("GET", directApiUrl)

            // Check if we got a valid file this time
            const stats = await RNFetchBlob.fs.stat(filePath)
            downloadSuccess = stats.size > 50000
          }
        } else {
          // For images, use the simpler approach since they're smaller
          const downloadUrl = getGoogleDriveDirectLink(fileId)
          console.log("Starting download from URL:", downloadUrl)

          // Download file
          const response = await RNFetchBlob.config({
            fileCache: true,
            path: filePath,
            timeout: 60000, // 1 minute timeout for images
          }).fetch("GET", downloadUrl)

          // Check if download was successful
          const stats = await RNFetchBlob.fs.stat(filePath)
          downloadSuccess = stats.size > 0
        }

        // Verify download
        try {
          const stats = await RNFetchBlob.fs.stat(filePath)

          // Log verbose info about the downloaded file
          console.log("File stats:", stats)

          if (!stats || stats.size === 0) {
            throw new Error("Downloaded file is empty")
          }

          // Check if file is suspiciously small for video
          if (stats.size < 50000 && item.type.toLowerCase().includes("video")) {
            console.log("File is suspiciously small, checking content type...")

            // Read first few bytes to check file signature
            const header = await RNFetchBlob.fs.readFile(filePath, "base64")
            console.log("File header:", header.substring(0, 24)) // Look at a portion of the file

            // Check if it's HTML instead of video data
            if (
              header.includes("PCFET0NUWVBFIGh0bWw+") || // <!DOCTYPE html>
              header.includes("PGh0bWw+")
            ) {
              // <html>
              console.log("Downloaded file appears to be HTML, not video")
              throw new Error("Downloaded file is HTML, not video")
            }

            if (!downloadSuccess) {
              throw new Error("Failed to download the video file")
            }
          }

          console.log("Successfully downloaded:", item.title, "Size:", stats.size)
          Toast.show({
            type: "success",
            text1: "Download Complete",
            text2: `File downloaded: ${item.title}`,
          })
        } catch (verifyErr) {
          console.error("Error verifying downloaded file:", verifyErr)
          throw new Error("Failed to verify downloaded file")
        }
      } catch (err) {
        console.error("Failed to download file:", item.title, err)
        Toast.show({
          type: "error",
          text1: "Download Error",
          text2: `Failed to download file: ${item.title}`,
        })
        // Don't throw here to allow other files to download
      }
    }
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
