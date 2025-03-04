import { DocumentDirectoryPath, exists, writeFile } from "react-native-fs"
import Toast from "react-native-toast-message"
import axios from "axios"
import RNFetchBlob from "react-native-blob-util"

interface MediaItem {
  contentId: number
  id: number
  link: string
  title: string
  tvId: number
  type: string
}

const getFileExtension = (url: string): string => {
  const urlParts = url.split(".")
  return urlParts[urlParts.length - 1].split("?")[0] // Remove query parameters if any
}

export const downloadFiles = async (items: MediaItem[]) => {
  try {
    await Promise.all(
      items.map(async (item) => {
        try {
          const extension = getFileExtension(item?.link)
          const filePath = `${DocumentDirectoryPath}/${item?.title}.${extension}`

          // Check if the file already exists
          const fileExists = await exists(filePath)
          if (fileExists) {
            console.log(`✅ File already exists: ${filePath} - Successfully synced`)
            // Update progress to 100% (synced)
            return // Skip
          }

          // Download the file
          await RNFetchBlob.config({ path: filePath }).fetch("GET", item.link)
          Toast.show({
            type: "success",
            text1: "Download Complete",
            text2: `File downloaded: ${item.title}`,
          })
        } catch (err) {
          console.error(`❌ Failed to download file ${item.title}:`, err)
          Toast.show({
            type: "error",
            text1: "Download Error",
            text2: `Failed to download file: ${item.title}`,
          })
        }
      }),
    )
  } catch (err) {
    console.error("❌ Error during download process:", err)
    Toast.show({
      type: "error",
      text1: "Download Failed",
      text2: "Could not download media files",
    })
  }
}
